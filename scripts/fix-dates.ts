/**
 * Re-dates photos that the import could only date from the file's modified
 * time (date_source = 'mtime'), and splits them into proper entries.
 *
 *   npm run fix-dates            # apply
 *   npm run fix-dates -- --dry   # show the plan only
 *
 * Signals, strongest first:
 *   1. a date visible IN the photo (screenshots, camera timestamps) — read by Claude
 *   2. iPhone IMG_#### numbering, interpolated between neighbours with EXIF dates
 *   3. Claude's best guess from the scene (season, event) — low confidence
 * Photos with no usable signal stay where they are but are still split into
 * separate entries by scene so they aren't one giant pile.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import exifr from "exifr";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Database } from "../src/lib/database.types";
import { toDateOnly } from "../src/lib/dates";

loadEnv({ path: ".env.local" });
const DRY = process.argv.includes("--dry");
const IMPORT_DIR = process.env.IMPORT_DIR ?? "import";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
const db = createClient<Database>(url, key, { auth: { persistSession: false } });
const claude = new Anthropic();

const Look = z.object({
  visible_date: z.string().nullable().describe("A date printed/visible in the image (timestamps, chat headers, tickets, calendars) as YYYY-MM-DD, else null. If only month/year is visible use the 1st."),
  visible_date_certain: z.boolean().describe("true only if a full date is clearly legible"),
  guessed_date: z.string().nullable().describe("Best-guess YYYY-MM-DD from the scene (season, holiday, event) if reasonably inferable, else null"),
  scene: z.string().describe("3-6 word label of the scene/event, used to group photos from the same occasion"),
});

type Signal = { date: string | null; source: "visible" | "imgnum" | "guess" | "none"; note: string };

async function lookAt(bytes: Uint8Array, media: "image/webp" | "image/jpeg") {
  const res = await claude.messages.parse({
    model: "claude-opus-5",
    max_tokens: 500,
    output_config: { format: zodOutputFormat(Look), effort: "low" },
    system: "You help date photos for a couple's scrapbook. Be literal about visible dates; be conservative with guesses.",
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: media, data: Buffer.from(bytes).toString("base64") } },
      { type: "text", text: "Is there a date visible in this image? Describe the scene." },
    ] }],
  });
  return res.parsed_output;
}

function imgNumber(name: string): number | null {
  const m = name.match(/^IMG_(\d{4,5})/i);
  return m ? Number(m[1]) : null;
}

async function main() {
  console.log(`\n🗓  fixing mtime-dated photos${DRY ? " (dry run)" : ""}\n`);

  // Map file hash → filename, and IMG number → EXIF date, from the import folder.
  const names = (await readdir(IMPORT_DIR)).filter((n) => !n.startsWith(".") && /\.(jpe?g|png|hei[cf]|webp)$/i.test(n));
  const byHash = new Map<string, string>();
  const numDates: { n: number; date: string }[] = [];
  for (const n of names) {
    const buf = await readFile(path.join(IMPORT_DIR, n));
    byHash.set(createHash("sha256").update(buf).digest("hex"), n);
    const num = imgNumber(n);
    if (num != null && !/copy/i.test(n)) {
      try {
        const ex = await exifr.parse(buf, { pick: ["DateTimeOriginal", "CreateDate"] });
        const d: unknown = ex?.DateTimeOriginal ?? ex?.CreateDate;
        if (d instanceof Date && !Number.isNaN(d.getTime())) numDates.push({ n: num, date: toDateOnly(d) });
      } catch { /* ignore */ }
    }
  }
  numDates.sort((a, b) => a.n - b.n);

  function fromImgNumber(name: string): { date: string; note: string } | null {
    const num = imgNumber(name);
    if (num == null || numDates.length === 0) return null;
    const exact = numDates.find((x) => x.n === num);
    if (exact) return { date: exact.date, note: `same IMG number as an EXIF-dated file` };
    const before = [...numDates].reverse().find((x) => x.n < num);
    const after = numDates.find((x) => x.n > num);
    const daysApart = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
    // The phone's numbering has reset at least once, so neighbours must agree
    // (within ~3 months) unless one of them is practically adjacent.
    if (before && after && after.n - before.n <= 400 && daysApart(before.date, after.date) <= 90) {
      const pick = num - before.n <= after.n - num ? before : after;
      return { date: pick.date, note: `between IMG_${before.n} (${before.date}) and IMG_${after.n} (${after.date})` };
    }
    const near = before && num - before.n <= 8 ? before : after && after.n - num <= 8 ? after : null;
    if (near) return { date: near.date, note: `next to IMG_${near.n} (${near.date})` };
    return null;
  }

  const { data: photos } = await db.from("photos").select("id, entry_id, storage_path, source_hash, caption").eq("date_source", "mtime");
  if (!photos?.length) { console.log("nothing to fix ✓"); return; }
  const { data: author } = await db.from("profiles").select("id").eq("email", process.env.IMPORT_AS ?? "stuti@journal.local").single();
  if (!author) throw new Error("author profile missing");

  // 1. gather signals ----------------------------------------------------------
  const plan: { id: string; entry_id: string; name: string; signal: Signal; scene: string }[] = [];
  for (const [i, p] of photos.entries()) {
    const name = (p.source_hash && byHash.get(p.source_hash)) ?? p.storage_path;
    let signal: Signal = { date: null, source: "none", note: "" };
    let scene = p.caption ?? "";
    try {
      const { data: blob } = await db.storage.from("photos").download(p.storage_path);
      const bytes = new Uint8Array(await blob!.arrayBuffer());
      const look = await lookAt(bytes, p.storage_path.endsWith(".jpg") ? "image/jpeg" : "image/webp");
      if (look) {
        scene = look.scene || scene;
        const vis = look.visible_date && /^\d{4}-\d{2}-\d{2}$/.test(look.visible_date) ? look.visible_date : null;
        if (vis && look.visible_date_certain) signal = { date: vis, source: "visible", note: "date visible in the photo" };
        else {
          const byNum = fromImgNumber(name);
          if (byNum) signal = { date: byNum.date, source: "imgnum", note: byNum.note };
          else if (vis) signal = { date: vis, source: "visible", note: "partial date visible in the photo" };
          else if (look.guessed_date && /^\d{4}-\d{2}-\d{2}$/.test(look.guessed_date)) signal = { date: look.guessed_date, source: "guess", note: "guessed from the scene" };
        }
      }
    } catch (e) {
      if (e instanceof Anthropic.BadRequestError && /credit balance/i.test(e.message)) {
        throw new Error("Anthropic credits ran out — top up at console.anthropic.com, then rerun. Nothing was changed.");
      }
      const byNum = fromImgNumber(name);
      if (byNum) signal = { date: byNum.date, source: "imgnum", note: byNum.note };
      console.warn(`   (couldn't look at ${name}: ${e instanceof Error ? e.message : e})`);
    }
    plan.push({ id: p.id, entry_id: p.entry_id, name, signal, scene });
    console.log(`  [${i + 1}/${photos.length}] ${name.padEnd(42)} → ${signal.date ?? "keep      "}  ${signal.source.padEnd(8)} ${signal.note}${signal.source === "none" ? `  · ${scene}` : ""}`);
  }

  // 2. group into target entries ----------------------------------------------
  // Dated photos group by date. Undated ones get clustered by occasion in one
  // text-only Claude pass so "garba night" and "navratri garba" land together.
  const undated = plan.filter((p) => !p.signal.date);
  const clusterOf = new Map<string, string>();
  if (undated.length > 1) {
    const Clusters = z.object({ groups: z.array(z.object({ label: z.string().describe("2-4 word occasion label"), ids: z.array(z.string()) })) });
    const res = await claude.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      output_config: { format: zodOutputFormat(Clusters), effort: "low" },
      messages: [{ role: "user", content: `Group these photos by occasion (same event/outing/call). Photos from clearly the same occasion share a group; unrelated ones get their own. Every id must appear exactly once.\n\n${undated.map((p) => `${p.id}: ${p.scene}${p.name ? ` (file ${p.name})` : ""}`).join("\n")}` }],
    });
    for (const g of res.parsed_output?.groups ?? []) for (const id of g.ids) clusterOf.set(id, g.label);
  }
  const groups = new Map<string, typeof plan>();
  for (const p of plan) {
    const k = p.signal.date ?? `undated:${clusterOf.get(p.id) ?? p.scene}`;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  console.log(`\n${plan.length} photos → ${groups.size} entries\n`);
  for (const [k, ps] of groups) console.log(`  ${k.padEnd(28)} ${ps.length} photo(s)`);
  if (DRY) return;

  // 3. apply ---------------------------------------------------------------------
  const touched = new Set(plan.map((p) => p.entry_id));
  const { data: existing } = await db.from("entries").select("id, date, photos(id)").eq("author", author.id);
  for (const [k, ps] of groups) {
    const date = k.startsWith("undated:") ? "2026-09-20" : k;
    // reuse an entry on that date that we aren't emptying, else create one
    let target = k.startsWith("undated:") ? null : (existing ?? []).find((e) => e.date === date && !touched.has(e.id)) ?? null;
    if (!target) {
      const { data, error } = await db.from("entries").insert({ date, note: "", author: author.id, title: k.startsWith("undated:") ? k.slice(8) : null }).select("id, date, photos(id)").single();
      if (error) throw new Error(error.message);
      target = data;
    }
    let order = (target.photos as { id: string }[] | null)?.length ?? 0;
    for (const p of ps) {
      const { error } = await db.from("photos").update({ entry_id: target.id, sort_order: order++, date_source: p.signal.source === "none" ? "mtime" : "manual" }).eq("id", p.id);
      if (error) throw new Error(error.message);
    }
    console.log(`  ✓ ${date}${k.startsWith("undated:") ? ` · "${k.slice(8)}"` : ""} ← ${ps.length} photo(s)`);
  }

  // 4. delete entries left empty ---------------------------------------------------
  const { data: maybeEmpty } = await db.from("entries").select("id, note, photos(id)").in("id", [...touched]);
  const empties = (maybeEmpty ?? []).filter((e) => !(e.photos as { id: string }[] | null)?.length && !e.note);
  if (empties.length) {
    await db.from("entries").delete().in("id", empties.map((e) => e.id));
    console.log(`\n🧹 removed ${empties.length} now-empty entr${empties.length === 1 ? "y" : "ies"}`);
  }
  console.log("\ndone ✓ — undated photos are titled by scene; open them in the app to set a real date.\n");
}

main().catch((e) => { console.error("\n❌", e instanceof Error ? e.message : e); process.exit(1); });
