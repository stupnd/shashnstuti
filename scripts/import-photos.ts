/**
 * Bulk-import photos from ./import into the journal.
 *
 *   npm run import              # everything in ./import
 *   npm run import -- --dry     # plan only, no uploads
 *   npm run import -- --no-geocode
 *
 * Safe to re-run: files already imported (by content hash) are skipped, and
 * photos from a day that already has an entry are appended to that entry.
 * Runs with the service-role key, so it bypasses RLS — keep it local.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import exifr from "exifr";
import heicConvert from "heic-convert";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import type { Database, DateSource } from "../src/lib/database.types";
import { dateFromFilename } from "../src/lib/photos/date-from-filename";
import { relationshipYear, toDateOnly } from "../src/lib/dates";

loadEnv({ path: ".env.local" });

const IMPORT_DIR = process.env.IMPORT_DIR ?? "import";
const IMPORT_AS = process.env.IMPORT_AS ?? "stuti@journal.local";
const DRY = process.argv.includes("--dry");
const GEOCODE = !process.argv.includes("--no-geocode");
const MAX_EDGE = 1600;
const SAME_PLACE_KM = 2;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
const db = createClient<Database>(url, key, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------

type Scanned = {
  file: string;
  hash: string;
  date: string;
  takenAt: Date | null;
  dateSource: DateSource;
  lat: number | null;
  lng: number | null;
  buffer: Buffer;
};

type Group = {
  date: string;
  lat: number | null;
  lng: number | null;
  photos: Scanned[];
  existingEntryId?: string;
  existingCount?: number;
};

function isHeic(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  const brand = buf.toString("ascii", 8, 12);
  return buf.toString("ascii", 4, 8) === "ftyp" && /^(heic|heix|hevc|mif1|msf1|heim|heis)$/.test(brand);
}

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s));
}

function samePlace(a: { lat: number | null; lng: number | null }, b: { lat: number | null; lng: number | null }) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return true; // unknown → same day is enough
  return km(a.lat, a.lng, b.lat, b.lng) <= SAME_PLACE_KM;
}

async function scan(file: string): Promise<Scanned> {
  const buffer = await readFile(file);
  const hash = createHash("sha256").update(buffer).digest("hex");

  let takenAt: Date | null = null;
  let lat: number | null = null;
  let lng: number | null = null;
  try {
    const exif = await exifr.parse(buffer, { pick: ["DateTimeOriginal", "CreateDate"] });
    const d: unknown = exif?.DateTimeOriginal ?? exif?.CreateDate;
    if (d instanceof Date && !Number.isNaN(d.getTime())) takenAt = d;
  } catch {
    /* no exif */
  }
  try {
    const g = await exifr.gps(buffer);
    if (g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)) {
      lat = g.latitude;
      lng = g.longitude;
    }
  } catch {
    /* no gps */
  }

  if (takenAt) return { file, hash, date: toDateOnly(takenAt), takenAt, dateSource: "exif", lat, lng, buffer };

  const fromName = dateFromFilename(path.basename(file));
  if (fromName) return { file, hash, date: fromName, takenAt: null, dateSource: "filename", lat, lng, buffer };

  const { mtime } = await stat(file);
  return { file, hash, date: toDateOnly(mtime), takenAt: mtime, dateSource: "mtime", lat, lng, buffer };
}

async function toWebp(input: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  let src: Buffer = input;
  if (isHeic(input)) {
    // sharp's prebuilt binaries can't decode HEIC, so go through libheif-js.
    const jpeg = await heicConvert({ buffer: input, format: "JPEG", quality: 0.92 });
    src = Buffer.from(jpeg);
  }
  const { data, info } = await sharp(src)
    .rotate() // apply EXIF orientation
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const geocodeCache = new Map<string, string | null>();
let lastGeocode = 0;
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const k = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (geocodeCache.has(k)) return geocodeCache.get(k)!;
  // Nominatim asks for max 1 request/second.
  const wait = 1100 - (Date.now() - lastGeocode);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocode = Date.now();
  try {
    const u = new URL("https://nominatim.openstreetmap.org/reverse");
    u.searchParams.set("lat", String(lat));
    u.searchParams.set("lon", String(lng));
    u.searchParams.set("format", "json");
    u.searchParams.set("zoom", "14");
    const res = await fetch(u, { headers: { "User-Agent": "us-journal-import/1.0 (private couple scrapbook)" } });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { address?: Record<string, string> };
    const a = j.address ?? {};
    const locality = a.suburb ?? a.neighbourhood ?? a.village ?? a.town ?? a.city ?? a.county;
    const region = a.city && a.city !== locality ? a.city : (a.state ?? a.country);
    const name = [locality, region].filter(Boolean).join(", ") || null;
    geocodeCache.set(k, name);
    return name;
  } catch {
    geocodeCache.set(k, null);
    return null;
  }
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n📚 importing from ./${IMPORT_DIR}${DRY ? " (dry run)" : ""}\n`);

  const { data: author } = await db.from("profiles").select("id, display_name").eq("email", IMPORT_AS).single();
  if (!author) throw new Error(`No profile for ${IMPORT_AS} — log in to the app once first.`);
  const { data: settings } = await db.from("settings").select("start_date").eq("id", 1).single();
  if (!settings) throw new Error("settings row missing — run the seed migration.");

  const { data: hashRows } = await db
    .from("photos")
    .select("source_hash, entry_id")
    .not("source_hash", "is", null);
  const seen = new Set((hashRows ?? []).map((r) => r.source_hash as string));
  const entryOfHash = new Map((hashRows ?? []).map((r) => [r.source_hash as string, r.entry_id]));

  const { data: existingEntries } = await db
    .from("entries")
    .select("id, date, place_lat, place_lng, photos(id)")
    .eq("author", author.id);

  // 1. scan --------------------------------------------------------------------
  const names = (await readdir(IMPORT_DIR))
    .filter((n) => !n.startsWith(".") && IMAGE_EXT.has(path.extname(n).toLowerCase()))
    .sort();
  const scanned: Scanned[] = [];
  let skipped = 0;
  const gpsFixes = new Map<string, { lat: number; lng: number }>(); // entry id → coords
  for (const [i, name] of names.entries()) {
    const file = path.join(IMPORT_DIR, name);
    const s = await scan(file);
    if (seen.has(s.hash)) {
      skipped++;
      const entryId = entryOfHash.get(s.hash);
      const ex = entryId ? (existingEntries ?? []).find((e) => e.id === entryId) : null;
      const needsFix = ex && ex.place_lat == null && s.lat != null && s.lng != null && !gpsFixes.has(ex.id);
      if (needsFix) gpsFixes.set(ex.id, { lat: s.lat!, lng: s.lng! });
      console.log(`  [${i + 1}/${names.length}] ${name}  — already imported${needsFix ? ", will add its location" : ", skipping"}`);
      continue;
    }
    seen.add(s.hash); // duplicates within this run (e.g. "IMG_1 2.JPG")
    scanned.push(s);
    console.log(`  [${i + 1}/${names.length}] ${name}  → ${s.date} (${s.dateSource})${s.lat != null ? " 📍" : ""}`);
  }
  console.log(`\n${scanned.length} new photos, ${skipped} skipped as duplicates.\n`);

  // Backfill coordinates (+ place name) on entries imported before GPS was read.
  if (gpsFixes.size && !DRY) {
    console.log(`📍 adding locations to ${gpsFixes.size} existing entr${gpsFixes.size === 1 ? "y" : "ies"}…`);
    for (const [entryId, c] of gpsFixes) {
      const place = GEOCODE ? await reverseGeocode(c.lat, c.lng) : null;
      const { error } = await db.from("entries").update({ place_lat: c.lat, place_lng: c.lng, place }).eq("id", entryId);
      if (error) console.warn(`   couldn't update ${entryId}: ${error.message}`);
      else console.log(`   ${entryId.slice(0, 8)} → ${place ?? `${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}`}`);
    }
    console.log();
  }
  if (scanned.length === 0) return summary([], [], settings.start_date, skipped);

  // 2. group by day (+ place) ---------------------------------------------------
  scanned.sort((a, b) => (a.takenAt?.getTime() ?? 0) - (b.takenAt?.getTime() ?? 0));
  const groups: Group[] = [];
  for (const p of scanned) {
    let g = groups.find((x) => x.date === p.date && samePlace(x, p));
    if (!g) {
      g = { date: p.date, lat: p.lat, lng: p.lng, photos: [] };
      const ex = (existingEntries ?? []).find(
        (e) => e.date === p.date && samePlace({ lat: e.place_lat, lng: e.place_lng }, p),
      );
      if (ex) {
        g.existingEntryId = ex.id;
        g.existingCount = (ex.photos as { id: string }[] | null)?.length ?? 0;
      }
      groups.push(g);
    }
    if (g.lat == null && p.lat != null) {
      g.lat = p.lat;
      g.lng = p.lng;
    }
    g.photos.push(p);
  }
  console.log(`${groups.length} entries to write (${groups.filter((g) => g.existingEntryId).length} existing days will get more photos).\n`);
  if (DRY) return summary(groups, scanned, settings.start_date, skipped);

  // 3. write -------------------------------------------------------------------
  const created: Group[] = [];
  for (const [gi, g] of groups.entries()) {
    let entryId = g.existingEntryId;
    let sortOrder = g.existingCount ?? 0;

    if (!entryId) {
      const place = GEOCODE && g.lat != null && g.lng != null ? await reverseGeocode(g.lat, g.lng) : null;
      const { data, error } = await db
        .from("entries")
        .insert({ date: g.date, note: "", author: author.id, place, place_lat: g.lat, place_lng: g.lng })
        .select("id")
        .single();
      if (error) throw new Error(`entry insert failed for ${g.date}: ${error.message}`);
      entryId = data.id;
      created.push(g);
      console.log(`✏️  [${gi + 1}/${groups.length}] ${g.date}${place ? ` · ${place}` : ""} — new entry, ${g.photos.length} photo(s)`);
    } else {
      console.log(`➕ [${gi + 1}/${groups.length}] ${g.date} — adding ${g.photos.length} photo(s) to existing entry`);
    }

    for (const p of g.photos) {
      const { data: webp, width, height } = await toWebp(p.buffer);
      const photoId = crypto.randomUUID();
      const storagePath = `${entryId}/${photoId}.webp`;
      const { error: upErr } = await db.storage.from("photos").upload(storagePath, webp, { contentType: "image/webp" });
      if (upErr) throw new Error(`upload failed for ${p.file}: ${upErr.message}`);
      const { error: rowErr } = await db.from("photos").insert({
        id: photoId,
        entry_id: entryId,
        storage_path: storagePath,
        width,
        height,
        taken_at: p.takenAt ? p.takenAt.toISOString() : null,
        date_source: p.dateSource,
        source_hash: p.hash,
        sort_order: sortOrder++,
      });
      if (rowErr) throw new Error(`photo row failed for ${p.file}: ${rowErr.message}`);
      console.log(`     ↑ ${path.basename(p.file)}  ${width}×${height}  ${(webp.length / 1024).toFixed(0)} KB`);
    }
  }

  summary(created, scanned, settings.start_date, skipped);
}

function summary(created: Group[], scanned: Scanned[], startDate: string, skipped: number) {
  console.log("\n──────────── summary ────────────");
  const perYear = new Map<number, number>();
  for (const g of created) {
    const y = relationshipYear(startDate, g.date);
    perYear.set(y, (perYear.get(y) ?? 0) + 1);
  }
  if (perYear.size === 0) console.log("no new entries created");
  for (const [y, n] of [...perYear.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`year ${y}: ${n} new entr${n === 1 ? "y" : "ies"}`);
  }
  console.log(`photos: ${scanned.length} imported, ${skipped} skipped`);

  const mtime = scanned.filter((s) => s.dateSource === "mtime");
  if (mtime.length) {
    console.log(`\n⚠️  ${mtime.length} photo(s) had no EXIF or filename date — dated from file modified time, double-check these:`);
    for (const s of mtime) console.log(`   ${s.date}  ${path.basename(s.file)}`);
  }
  console.log();
}

main().catch((e) => {
  console.error("\n❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
