"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createEntry,
  registerPhotos,
  removePhoto,
  updateEntry,
  type EntryInput,
  type PhotoRowInput,
} from "@/lib/actions/entries";
import type { EntryCard } from "@/lib/entries";
import { processImage, readPhotoMeta, uploadToStorage, type ProcessedImage } from "@/lib/photos/browser";
import type { PhotoMeta } from "@/lib/photos/types";
import { formatShortDate } from "@/lib/dates";
import { HeartBurst } from "./hearts";
import { Icon, MOODS, iconFor } from "./icons";

const TAG_PRESETS = ["trip", "date night", "silly", "food", "home", "friends", "family", "celebration"];

type Picked = {
  key: string;
  file: File;
  status: "reading" | "ready" | "uploading" | "done" | "failed";
  progress: number;
  error?: string;
  meta?: PhotoMeta;
  image?: ProcessedImage;
};

type Props =
  | { mode: "create" }
  | { mode: "edit"; entry: EntryCard };

export function MomentForm(props: Props) {
  const router = useRouter();
  const existing = props.mode === "edit" ? props.entry : null;

  const [picked, setPicked] = useState<Picked[]>([]);
  const [existingPhotos, setExistingPhotos] = useState(existing?.photos ?? []);
  const [date, setDate] = useState(existing?.date ?? "");
  const [dateTouched, setDateTouched] = useState(Boolean(existing));
  const [title, setTitle] = useState(existing?.title ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [place, setPlace] = useState(existing?.place ?? "");
  const [mood, setMood] = useState(existing?.mood ? iconFor(existing.mood, "happy") : "");
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [customTag, setCustomTag] = useState("");
  const [milestone, setMilestone] = useState(existing?.is_milestone ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const update = useCallback((key: string, patch: Partial<Picked>) => {
    setPicked((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }, []);

  // Earliest photo date pre-fills the entry date (until the user touches it).
  const earliest = useMemo(() => {
    const dates = picked.map((p) => p.meta?.date).filter(Boolean) as string[];
    return dates.sort()[0] ?? null;
  }, [picked]);
  const effectiveDate = dateTouched ? date : (earliest ?? date);

  const gps = useMemo(() => {
    const p = picked.find((x) => x.meta?.lat != null);
    return p?.meta?.lat != null && p.meta.lng != null ? { lat: p.meta.lat, lng: p.meta.lng } : null;
  }, [picked]);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const items: Picked[] = Array.from(files).map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      status: "reading",
      progress: 0,
    }));
    setPicked((list) => [...list, ...items]);
    if (fileInput.current) fileInput.current.value = "";

    // Process sequentially: HEIC decoding is heavy on a phone.
    for (const item of items) {
      try {
        const [meta, image] = await Promise.all([readPhotoMeta(item.file), processImage(item.file)]);
        update(item.key, { meta, image, status: "ready" });
      } catch (e) {
        update(item.key, { status: "failed", error: e instanceof Error ? e.message : "couldn't read this photo" });
      }
    }
  }

  function removePicked(key: string) {
    setPicked((list) => {
      const p = list.find((x) => x.key === key);
      if (p?.image) URL.revokeObjectURL(p.image.previewUrl);
      return list.filter((x) => x.key !== key);
    });
  }

  async function removeExisting(id: string) {
    if (!confirm("Remove this photo?")) return;
    // Keep the moment while editing — don't wipe the whole entry if this was the last photo.
    await removePhoto(id, { removeEmptyEntry: false });
    setExistingPhotos((list) => list.filter((p) => p.id !== id));
  }

  async function uploadAll(entryId: string, startOrder: number) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not signed in");

    const rows: PhotoRowInput[] = [];
    let order = startOrder;
    const ready = picked.filter((p) => p.status === "ready" || p.status === "failed");

    for (const p of ready) {
      if (!p.image || !p.meta) continue;
      const id = crypto.randomUUID();
      const path = `${entryId}/${id}.${p.image.ext}`;
      update(p.key, { status: "uploading", progress: 0, error: undefined });
      try {
        await uploadToStorage({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          accessToken: session.access_token,
          bucket: "photos",
          path,
          blob: p.image.blob,
          onProgress: (f) => update(p.key, { progress: f }),
        });
        rows.push({
          id,
          storage_path: path,
          width: p.image.width,
          height: p.image.height,
          taken_at: p.meta.takenAt ? p.meta.takenAt.toISOString() : null,
          date_source: p.meta.dateSource,
          sort_order: order++,
        });
        update(p.key, { status: "done", progress: 1 });
      } catch (e) {
        update(p.key, { status: "failed", error: e instanceof Error ? e.message : "upload failed" });
      }
    }
    if (rows.length) await registerPhotos(entryId, rows);
    return rows.length;
  }

  async function onSave() {
    setError(null);
    if (!effectiveDate) return setError("When did this happen?");
    if (picked.some((p) => p.status === "reading")) return setError("Still reading your photos — one sec.");
    if (props.mode === "create" && picked.filter((p) => p.status === "ready").length === 0) {
      return setError("Add at least one photo.");
    }

    setSaving(true);
    try {
      const input: EntryInput = {
        date: effectiveDate,
        title,
        note,
        place,
        mood,
        tags,
        is_milestone: milestone,
        fallbackLatLng: gps,
      };
      let id: string;
      if (props.mode === "create") {
        ({ id } = await createEntry(input));
      } else {
        id = props.entry.id;
        await updateEntry(id, input);
      }
      await uploadAll(id, existingPhotos.length);
      setBurst((b) => b + 1);
      setTimeout(() => router.push(`/entry/${id}`), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  function toggleTag(t: string) {
    setTags((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]));
  }
  function addCustomTag() {
    const t = customTag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((l) => [...l, t]);
    setCustomTag("");
  }

  const busy = saving;

  return (
    <div className="space-y-6">
      <HeartBurst burst={burst} />

      {/* ---- photos ---- */}
      <section className="space-y-3">
        <input
          ref={fileInput}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="dashed flex w-full flex-col items-center gap-2 py-8 text-ink"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon name="camera" size={24} /></span>
          <span className="font-semibold">tap to add photos</span>
          <span className="label">jpg · png · heic</span>
        </button>

        {existingPhotos.length > 0 && (
          <ul className="grid grid-cols-4 gap-2">
            {existingPhotos.map((p) => (
              <li key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-bg-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExisting(p.id)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <Icon name="close" size={12} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}


        <ul className="space-y-2">
          {picked.map((p) => (
            <li
              key={p.key}
              className={`card flex items-center gap-3 p-2.5 ${p.status === "failed" ? "border-accent bg-accent-soft/50" : ""}`}
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-bg-soft">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full animate-pulse" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.file.name}</p>
                <p className="text-xs text-muted">
                  {p.status === "reading" && "reading…"}
                  {p.status === "ready" && p.meta && (
                    <>
                      {formatShortDate(p.meta.date)}
                      <span className="opacity-60"> · {p.meta.dateSource === "exif" ? "from photo" : p.meta.dateSource === "filename" ? "from filename" : "today"}</span>
                    </>
                  )}
                  {p.status === "uploading" && `uploading… ${Math.round(p.progress * 100)}%`}
                  {p.status === "done" && "uploaded"}
                  {p.status === "failed" && <span className="text-accent">{p.error ?? "failed"}</span>}
                </p>
                {p.status === "uploading" && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
                    <div className="h-full bg-accent transition-[width]" style={{ width: `${p.progress * 100}%` }} />
                  </div>
                )}
              </div>
              {p.status === "done" ? (
                <Icon name="check" size={18} className="text-ink" aria-label="uploaded" />
              ) : (
                <button
                  type="button"
                  onClick={() => removePicked(p.key)}
                  disabled={p.status === "uploading"}
                  aria-label="Remove"
                  className="btn btn-ghost px-2 text-muted hover:text-accent"
                >
                  <Icon name="trash" size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ---- details ---- */}
      <section className="card p-5 space-y-5">
        <label className="block">
          <span className="label">when</span>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => {
              setDateTouched(true);
              setDate(e.target.value);
            }}
            className="input mt-1.5"
            required
          />
          {!dateTouched && earliest && (
            <span className="mt-1 block text-xs text-muted">pre-filled from your photos — change it if it&apos;s off</span>
          )}
        </label>

        <label className="block">
          <span className="label">the note</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="what happened, what you felt, the tiny detail you want to remember…"
            className="input mt-1.5 font-hand text-2xl leading-snug"
          />
        </label>

        <label className="block">
          <span className="label">title · optional</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input mt-1.5" maxLength={80} />
        </label>

        <label className="block">
          <span className="label">place · optional</span>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="that café, the beach, home…"
            className="input mt-1.5"
            maxLength={120}
          />
        </label>

        <div>
          <span className="label">mood</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMood(mood === m.key ? "" : m.key)}
                aria-pressed={mood === m.key}
                aria-label={m.label}
                title={m.label}
                className="chip chip-icon"
              >
                <Icon name={m.key} size={22} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">tags</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {Array.from(new Set([...TAG_PRESETS, ...tags])).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                aria-pressed={tags.includes(t)}
                className="chip"
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
              placeholder="add your own"
              className="input py-2 text-sm"
              maxLength={24}
            />
            <button type="button" onClick={addCustomTag} className="btn btn-soft py-2">add</button>
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-2xl bg-bg-soft px-4 py-3">
          <span className="flex items-center gap-3">
            <Icon name="sparkle" size={22} className={milestone ? "text-accent" : "text-muted"} />
            <span>
              <span className="font-semibold">milestone</span>
              <span className="block text-xs text-muted">first date, first trip, moving in — the big ones</span>
            </span>
          </span>
          <input type="checkbox" checked={milestone} onChange={(e) => setMilestone(e.target.checked)} className="h-5 w-5 accent-[#e0464f]" />
        </label>
      </section>

      {error && (
        <p className="text-sm font-medium text-accent" role="alert">{error}</p>
      )}

      <button type="button" onClick={onSave} disabled={busy} className="btn btn-primary w-full py-4 text-base">
        {busy ? "saving…" : props.mode === "create" ? "add to our book" : "save changes"}
      </button>
    </div>
  );
}
