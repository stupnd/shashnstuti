/**
 * Splits multi-photo entries by occasion. Claude looks at all the photos of
 * an entry together and groups them: same place + same outfits + same light
 * → keep together; a different outing on the same day → its own entry.
 *
 *   npm run split-entries               # every entry with 2+ photos
 *   npm run split-entries -- --dry      # plan only
 *   npm run split-entries -- --entry <id>
 *
 * Safe to rerun: an entry whose photos all belong together is left alone.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import sharp from "sharp";
import { z } from "zod";
import type { Database } from "../src/lib/database.types";

loadEnv({ path: ".env.local" });
const DRY = process.argv.includes("--dry");
const ONLY = process.argv.includes("--entry") ? process.argv[process.argv.indexOf("--entry") + 1] : null;
const MAX_PHOTOS = 40;   // bigger entries are skipped (too many images per request)
const THUMB = 512;       // px, keeps token cost low

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
const db = createClient<Database>(url, key, { auth: { persistSession: false } });
const claude = new Anthropic();

const Groups = z.object({
  groups: z.array(z.object({
    label: z.string().describe("2-5 word name for this occasion, e.g. 'garba night', 'brunch downtown'"),
    photos: z.array(z.number().int()).describe("1-based photo numbers in this group"),
  })).describe("One group per distinct occasion, in the order the photos appear"),
});

const SYSTEM = `You organise a couple's scrapbook. You'll get all photos from ONE day. Split them into occasions.
Keep photos together when they're clearly the same occasion: same place, same outfits, same lighting/time of day, same people/vibe — even if the framing differs.
Put photos in DIFFERENT groups when the outfits, location or time of day clearly changed (e.g. a daytime café and an evening party), or when they're unrelated (a screenshot, a random object).
When unsure, keep together. Every photo number appears in exactly one group.`;

async function thumb(storagePath: string): Promise<string> {
  const { data, error } = await db.storage.from("photos").download(storagePath);
  if (error || !data) throw new Error(error?.message ?? "download failed");
  const buf = Buffer.from(await data.arrayBuffer());
  const out = await sharp(buf).resize(THUMB, THUMB, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
  return out.toString("base64");
}

async function main() {
  console.log(`\n✂️  splitting entries by occasion${DRY ? " (dry run)" : ""}\n`);
  let q = db.from("entries").select("id, date, title, note, place, place_lat, place_lng, tags, author, photos(id, storage_path, sort_order, caption)").order("date");
  if (ONLY) q = q.eq("id", ONLY);
  const { data: entries, error } = await q;
  if (error) throw new Error(error.message);

  let created = 0;
  let checked = 0;
  for (const e of entries ?? []) {
    const photos = [...(e.photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    if (photos.length < 2) continue;
    if (photos.length > MAX_PHOTOS) { console.log(`  ${e.date}  ${photos.length} photos — too many, skipping`); continue; }
    checked++;

    const images = await Promise.all(photos.map((p) => thumb(p.storage_path)));
    const content: Anthropic.ContentBlockParam[] = [];
    photos.forEach((p, i) => {
      content.push({ type: "text", text: `photo ${i + 1}${p.caption ? ` — ${p.caption}` : ""}` });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: images[i] } });
    });
    content.push({ type: "text", text: `These ${photos.length} photos are all dated ${e.date}${e.place ? ` in ${e.place}` : ""}. Group them by occasion.` });

    let groups: { label: string; photos: number[] }[];
    try {
      const res = await claude.messages.parse({
        model: "claude-opus-5",
        max_tokens: 1500,
        output_config: { format: zodOutputFormat(Groups), effort: "low" },
        system: SYSTEM,
        messages: [{ role: "user", content }],
      });
      groups = res.parsed_output?.groups ?? [];
    } catch (err) {
      if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message)) throw new Error("Anthropic credits ran out — top up and rerun; already-split entries stay split.");
      console.warn(`  ${e.date}  ✗ ${err instanceof Error ? err.message : err}`);
      continue;
    }

    // sanity: every photo exactly once, else keep the entry as is
    const seen = new Set<number>();
    const valid = groups.every((g) => g.photos.every((n) => n >= 1 && n <= photos.length && !seen.has(n) && seen.add(n))) && seen.size === photos.length;
    if (!valid || groups.length < 2) {
      console.log(`  ${e.date}  ${photos.length} photos — one occasion${valid ? "" : " (unclear, left alone)"}`);
      continue;
    }

    console.log(`  ${e.date}  ${photos.length} photos → ${groups.length} occasions: ${groups.map((g) => `"${g.label}" (${g.photos.length})`).join(", ")}`);
    if (DRY) continue;

    // First (largest) group keeps the original entry; the rest get new entries.
    const [keep, ...rest] = [...groups].sort((a, b) => b.photos.length - a.photos.length);
    let order = 0;
    for (const n of keep.photos) await db.from("photos").update({ sort_order: order++ }).eq("id", photos[n - 1].id);
    if (!e.title && !e.note) await db.from("entries").update({ title: keep.label }).eq("id", e.id);

    for (const g of rest) {
      const { data: ne, error: insErr } = await db.from("entries").insert({
        date: e.date, note: "", title: g.label, author: e.author,
        place: e.place, place_lat: e.place_lat, place_lng: e.place_lng, tags: e.tags,
      }).select("id").single();
      if (insErr) throw new Error(insErr.message);
      let o = 0;
      for (const n of g.photos) {
        const { error: upErr } = await db.from("photos").update({ entry_id: ne.id, sort_order: o++ }).eq("id", photos[n - 1].id);
        if (upErr) throw new Error(upErr.message);
      }
      created++;
    }
  }
  console.log(`\nchecked ${checked} entries, created ${created} new one${created === 1 ? "" : "s"} ✓\n`);
}

main().catch((e) => { console.error("\n❌", e instanceof Error ? e.message : e); process.exit(1); });
