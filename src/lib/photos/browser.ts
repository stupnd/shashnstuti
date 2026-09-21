"use client";

import exifr from "exifr";
import { toDateOnly, todayDateOnly } from "@/lib/dates";
import { dateFromFilename } from "./date-from-filename";
import type { PhotoMeta } from "./types";

export const MAX_EDGE = 1600;

export function isHeic(file: File): boolean {
  return (
    /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
  );
}

/** EXIF date + GPS, then filename, then today. */
export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  let takenAt: Date | null = null;
  let lat: number | null = null;
  let lng: number | null = null;

  try {
    const exif = await exifr.parse(file, { pick: ["DateTimeOriginal", "CreateDate"] });
    const d: unknown = exif?.DateTimeOriginal ?? exif?.CreateDate;
    if (d instanceof Date && !Number.isNaN(d.getTime())) takenAt = d;
  } catch {
    // unreadable / no EXIF — fall through
  }
  try {
    // exifr.gps() is the reliable way to get coordinates (pick+gps isn't).
    const g = await exifr.gps(file);
    if (g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)) {
      lat = g.latitude;
      lng = g.longitude;
    }
  } catch {
    // no GPS
  }

  if (takenAt) {
    return { date: toDateOnly(takenAt), takenAt, dateSource: "exif", lat, lng };
  }
  const fromName = dateFromFilename(file.name);
  if (fromName) {
    return { date: fromName, takenAt: null, dateSource: "filename", lat, lng };
  }
  return { date: todayDateOnly(), takenAt: null, dateSource: "manual", lat, lng };
}

async function decode(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // the image keeps its pixels after decode(); the URL can go
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export type ProcessedImage = {
  blob: Blob;
  width: number;
  height: number;
  ext: "webp" | "jpg";
  previewUrl: string;
};

/**
 * HEIC → JPEG (if needed), fix orientation, shrink to MAX_EDGE, encode WebP.
 * Falls back to JPEG on browsers that can't encode WebP from a canvas.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  let source: Blob = file;

  if (isHeic(file)) {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    source = Array.isArray(out) ? out[0] : out;
  }

  // Modern browsers apply EXIF orientation when decoding into an <img>,
  // so drawing it onto a canvas gives us upright pixels.
  const img = await decode(source);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't get a canvas context");
  ctx.drawImage(img, 0, 0, width, height);

  let blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
  let ext: "webp" | "jpg" = "webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    ext = "jpg";
  }
  if (!blob) throw new Error("Couldn't encode the image");

  return { blob, width, height, ext, previewUrl: URL.createObjectURL(blob) };
}

/** Upload straight to Supabase Storage with real progress events. */
export function uploadToStorage(opts: {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
  bucket: string;
  path: string;
  blob: Blob;
  onProgress: (fraction: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${opts.supabaseUrl}/storage/v1/object/${opts.bucket}/${opts.path}`;
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${opts.accessToken}`);
    xhr.setRequestHeader("apikey", opts.anonKey);
    xhr.setRequestHeader("Content-Type", opts.blob.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(opts.blob);
  });
}
