/**
 * Has Claude look at every photo and write a short (4–5 word) caption.
 *
 *   npm run captions             # only photos without a caption
 *   npm run captions -- --redo   # rewrite all captions
 *
 * Needs ANTHROPIC_API_KEY (or an `ant auth login` profile) plus the Supabase
 * service-role key in .env.local. Requires migration 05 (photos.caption).
 */
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import type { Database } from "../src/lib/database.types";

loadEnv({ path: ".env.local" });

const REDO = process.argv.includes("--redo");
const CONCURRENCY = 4;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
const db = createClient<Database>(url, key, { auth: { persistSession: false } });
const claude = new Anthropic();

const SYSTEM = `You caption photos for a couple's private scrapbook. Write ONE caption of 4 to 5 words, lowercase, no punctuation at the end, no emoji, no quotes. Describe what is happening or the vibe, like a tiny handwritten note under a polaroid — warm and specific, never generic. Do not mention "a couple" or "two people" every time; vary it. If it's a screenshot or a document, say what it is briefly. Reply with the caption only.`;

async function caption(bytes: Uint8Array, mediaType: "image/webp" | "image/jpeg"): Promise<string> {
  const res = await claude.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 64,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: Buffer.from(bytes).toString("base64") } },
          { type: "text", text: "Caption this photo." },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error(`refused: ${res.stop_details?.category ?? "unknown"}`);
  const text = res.content.find((b) => b.type === "text")?.text ?? "";
  return text.trim().replace(/^["'“]+|["'”.]+$/g, "").slice(0, 60);
}

async function main() {
  let q = db.from("photos").select("id, storage_path, caption").order("created_at");
  if (!REDO) q = q.is("caption", null);
  const { data: photos, error } = await q;
  if (error) throw new Error(error.message.includes("caption") ? "Run supabase/migrations/20260920000005_captions.sql first." : error.message);
  if (!photos?.length) {
    console.log("nothing to caption ✓");
    return;
  }
  const total = photos.length;
  console.log(`captioning ${total} photo(s)…\n`);

  let done = 0;
  let failed = 0;
  const queue = [...photos];
  async function worker() {
    for (let p = queue.shift(); p; p = queue.shift()) {
      try {
        const { data: blob, error: dlErr } = await db.storage.from("photos").download(p.storage_path);
        if (dlErr || !blob) throw new Error(dlErr?.message ?? "download failed");
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const text = await caption(bytes, p.storage_path.endsWith(".jpg") ? "image/jpeg" : "image/webp");
        const { error: upErr } = await db.from("photos").update({ caption: text }).eq("id", p.id);
        if (upErr) throw new Error(upErr.message);
        done++;
        console.log(`  [${done + failed}/${total}] ${text}`);
      } catch (e) {
        failed++;
        if (e instanceof Anthropic.AuthenticationError) throw new Error("Anthropic API key is missing or invalid — set ANTHROPIC_API_KEY in .env.local");
        if (e instanceof Anthropic.RateLimitError) await new Promise((r) => setTimeout(r, 15_000));
        console.warn(`  ✗ ${p.storage_path}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\n${done} captioned, ${failed} failed.`);
}

main().catch((e) => {
  console.error("\n❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
