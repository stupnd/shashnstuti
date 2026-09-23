"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createEntry, registerPhotos, type PhotoRowInput } from "@/lib/actions/entries";
import { createClient } from "@/lib/supabase/client";
import { uploadToStorage } from "@/lib/photos/browser";
import { todayDateOnly } from "@/lib/dates";
import { Icon } from "@/components/icons";
import { applyGrade, FILTERS, lookFor, type FilterId } from "./filters";

/* Classic strip: four 4:3 frames stacked, white border, caption at the foot.
   Sized so the finished strip stays under the 1600px max edge the rest of the
   app uses. */
const FRAME_W = 480;
const FRAME_H = 360;
const PAD = 24;
const GAP = 12;
const FOOT = 70;
const STRIP_W = FRAME_W + PAD * 2;
const STRIP_H = PAD + FRAME_H * 4 + GAP * 3 + FOOT;

const SHOTS = 4;

type Phase = "idle" | "starting" | "counting" | "flash" | "review" | "saving";

/** Draw a video frame, centre-cropped to 4:3 and mirrored like a real booth. */
/** Raw capture — no look applied yet, so it can be reprinted later. */
function grabFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext("2d")!;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const target = FRAME_W / FRAME_H;
  let sw = vw;
  let sh = vw / target;
  if (sh > vh) {
    sh = vh;
    sw = vh * target;
  }
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;

  ctx.translate(FRAME_W, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, FRAME_W, FRAME_H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

/** Print a raw frame through a look, leaving the original untouched. */
function develop(raw: HTMLCanvasElement, filter: FilterId): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = FRAME_W;
  out.height = FRAME_H;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(raw, 0, 0);
  applyGrade(ctx, FRAME_W, FRAME_H, lookFor(filter).grade);
  return out;
}

function buildStrip(frames: HTMLCanvasElement[], caption: string, stamp: string, filter: FilterId): HTMLCanvasElement {
  const strip = document.createElement("canvas");
  strip.width = STRIP_W;
  strip.height = STRIP_H;
  const ctx = strip.getContext("2d")!;

  const look = lookFor(filter);
  // Paper, not white — and each look prints on its own stock.
  ctx.fillStyle = look.paper;
  ctx.fillRect(0, 0, STRIP_W, STRIP_H);

  // Faint fibres in the paper.
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(120, 96, 64, ${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * STRIP_W, Math.random() * STRIP_H, 1, 1);
  }

  frames.forEach((f, i) => {
    const y = PAD + i * (FRAME_H + GAP);
    ctx.fillStyle = "rgba(60, 42, 24, 0.35)";
    ctx.fillRect(PAD - 2, y - 2, FRAME_W + 4, FRAME_H + 4);
    ctx.drawImage(f, PAD, y, FRAME_W, FRAME_H);
  });

  ctx.fillStyle = look.ink;
  ctx.font = "italic 25px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.fillText(caption, STRIP_W / 2, STRIP_H - FOOT / 2 + 4);
  ctx.font = "11px Georgia, 'Times New Roman', serif";
  ctx.globalAlpha = 0.6;
  ctx.letterSpacing = "3px";
  ctx.fillText(stamp.toUpperCase(), STRIP_W / 2, STRIP_H - FOOT / 2 + 26);
  ctx.globalAlpha = 1;
  return strip;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("couldn't encode the photo"))), "image/webp", 0.92),
  );
}

export function Booth({ caption }: { caption: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const framesRef = useRef<HTMLCanvasElement[]>([]);

  const [filter, setFilter] = useState<FilterId>("vintage");
  const [flashOn, setFlashOn] = useState(true);
  const [flashing, setFlashing] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [taken, setTaken] = useState(0);
  const [strip, setStrip] = useState<{ url: string; blob: Blob } | null>(null);
  const [shots, setShots] = useState<{ url: string; blob: Blob }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  async function openCamera() {
    setError(null);
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      void runSequence();
    } catch (e) {
      setPhase("idle");
      const name = e instanceof Error ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "the camera needs permission — allow it and tap again"
          : name === "NotFoundError"
            ? "no camera on this device"
            : "couldn't open the camera",
      );
    }
  }

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function runSequence() {
    framesRef.current = [];
    setShots([]);
    setStrip(null);
    setTaken(0);

    for (let shot = 0; shot < SHOTS; shot++) {
      setPhase("counting");
      for (let c = 3; c > 0; c--) {
        setCount(c);
        await wait(900);
      }
      // No front-facing flash on the web, so the screen becomes the lamp:
      // go bright, give the sensor a moment to re-expose, then take it.
      if (flashOn) {
        setFlashing(true);
        await wait(280);
      }
      setPhase("flash");
      const video = videoRef.current;
      if (!video) return;
      const frame = grabFrame(video);
      setFlashing(false);
      framesRef.current.push(frame);
      setTaken(shot + 1);
      await wait(320);
    }

    await printStrip(filter);
    setPhase("review");
    stop();
  }

  /**
   * Develop the four raw frames through a look and build the strip. Called
   * after the shoot and again whenever you pick a different look on the
   * review screen — so you can shoot once and try all five.
   */
  const printStrip = useCallback(async (id: FilterId) => {
    if (framesRef.current.length === 0) return;
    const developed = framesRef.current.map((f) => develop(f, id));
    const blobs = await Promise.all(developed.map(toBlob));

    setShots((old) => {
      old.forEach((o) => URL.revokeObjectURL(o.url));
      return blobs.map((b) => ({ url: URL.createObjectURL(b), blob: b }));
    });

    const canvas = buildStrip(developed, caption, todayDateOnly(), id);
    const blob = await toBlob(canvas);
    setStrip((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return { url: URL.createObjectURL(blob), blob };
    });
  }, [caption]);

  /** Re-develop when you change your mind on the review screen. */
  function chooseFilter(id: FilterId) {
    setFilter(id);
    if (phase === "review") void printStrip(id);
  }

  async function save() {
    if (!strip) return;
    setPhase("saving");
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("you got signed out — reload and try again");

      const { id: entryId } = await createEntry({
        date: todayDateOnly(),
        title: "photobooth",
        note: "",
        place: "",
        mood: "laugh",
        tags: ["photobooth"],
        is_milestone: false,
      });

      const common = {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        accessToken: session.access_token,
        bucket: "photos",
        onProgress: () => {},
      };

      // The strip goes first so it becomes the tile's cover photo.
      const rows: PhotoRowInput[] = [];
      const all = [
        { blob: strip.blob, w: STRIP_W, h: STRIP_H },
        ...shots.map((s) => ({ blob: s.blob, w: FRAME_W, h: FRAME_H })),
      ];

      for (const [i, item] of all.entries()) {
        const id = crypto.randomUUID();
        const path = `${entryId}/${id}.webp`;
        await uploadToStorage({ ...common, path, blob: item.blob });
        rows.push({
          id,
          storage_path: path,
          width: item.w,
          height: item.h,
          taken_at: new Date().toISOString(),
          date_source: "manual",
          sort_order: i,
        });
      }

      await registerPhotos(entryId, rows);
      router.push(`/entry/${entryId}`);
    } catch (e) {
      setPhase("review");
      setError(e instanceof Error ? e.message : "couldn't save the strip");
    }
  }

  function retake() {
    // Hand the old object URLs back before dropping them.
    setStrip((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
    setShots((old) => {
      old.forEach((o) => URL.revokeObjectURL(o.url));
      return [];
    });
    setTaken(0);
    void openCamera();
  }

  const live = phase === "counting" || phase === "flash" || phase === "starting";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* The lamp: the screen is the only flash a front camera gets. */}
      {flashing && (
        <div
          className="pointer-events-none fixed inset-0 z-[60]"
          style={{ background: "#fffaf0", filter: "brightness(1.6)" }}
          aria-hidden
        />
      )}

      <header className="flex items-center justify-between gap-3 px-5 pt-[calc(1.1rem+env(safe-area-inset-top))] pb-3">
        <Link href="/" onClick={stop} className="label inline-flex items-center gap-1 hover:text-ink">
          <Icon name="back" size={14} /> back
        </Link>
        <p className="label">photobooth</p>
        <button
          type="button"
          onClick={() => setFlashOn((f) => !f)}
          aria-pressed={flashOn}
          aria-label={flashOn ? "Flash on" : "Flash off"}
          className="chip px-2.5 py-1 text-xs"
          style={flashOn ? { background: "var(--butter)" } : undefined}
        >
          <Icon name={flashOn ? "sun" : "moon"} size={13} />
          {flashOn ? "flash" : "no flash"}
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 pb-2">
        {phase === "review" && strip ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4">
            <div className="card overflow-hidden p-2" style={{ ["--card-shadow" as string]: "var(--pink)" }}>
              <Image
                src={strip.url}
                alt="your photo strip"
                width={STRIP_W}
                height={STRIP_H}
                unoptimized
                className="max-h-[52vh] w-auto rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={retake} className="btn btn-soft px-4 py-3">
                <Icon name="back" size={16} /> again
              </button>
              <button type="button" onClick={save} disabled={phase !== "review"} className="btn btn-primary px-5 py-3">
                <Icon name="check" size={16} /> keep it
              </button>
            </div>
          </div>
        ) : (
          <div
            className="card relative w-full max-w-md overflow-hidden p-0"
            style={{ ["--card-shadow" as string]: "var(--sky)", aspectRatio: "4 / 3" }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full -scale-x-100 object-cover"
              style={{ filter: lookFor(filter).css }}
            />

            {phase === "counting" && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/15">
                <span className="font-marker text-[6.5rem] leading-none text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.45)]">
                  {count}
                </span>
              </div>
            )}
            {phase === "flash" && <div className="absolute inset-0 bg-white" />}

            {phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-bg-soft p-6 text-center">
                <span className="sticker h-16 w-16 bg-pink text-accent">
                  <Icon name="camera" size={30} />
                </span>
                <p className="font-marker text-3xl leading-tight">four shots, one strip</p>
                <p className="text-sm text-muted">squeeze in close — it counts you down between each</p>
                <button type="button" onClick={openCamera} className="btn btn-primary mt-1 px-6 py-3">
                  <Icon name="camera" size={18} /> start
                </button>
              </div>
            )}

            {(live || phase === "saving") && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-ink/45 to-transparent pb-3 pt-8">
                {Array.from({ length: SHOTS }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 w-2 rounded-full ${i < taken ? "bg-white" : "bg-white/35"}`}
                  />
                ))}
                {phase === "saving" && <span className="ml-2 text-xs font-semibold text-white">developing…</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Look picker. Hidden mid-shoot so nothing shifts while you pose. */}
      {(phase === "idle" || phase === "review") && (
        <div className="-mx-1 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex w-max gap-2 pb-1">
            {FILTERS.map((f) => {
              const on = f.id === filter;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => chooseFilter(f.id)}
                  aria-pressed={on}
                  aria-label={f.label}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className="h-11 w-11 overflow-hidden rounded-full border-2 transition-transform"
                    style={{
                      borderColor: on ? "var(--ink)" : "var(--line)",
                      // Skin-to-sky gradient, so each look reads differently at
                      // a glance rather than being a flat tinted dot.
                      background:
                        "linear-gradient(150deg, #ffd9b8 0%, #e8a27a 38%, #8d6a5a 62%, #5b7fa6 100%)",
                      filter: f.css,
                      transform: on ? "scale(1.06)" : undefined,
                      boxShadow: on ? "2px 2px 0 var(--ink)" : undefined,
                    }}
                  />
                  <span className={`tab-label ${on ? "text-ink" : "text-muted"}`}>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="px-5 pt-2 text-center text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      <div className="pb-[calc(1rem+env(safe-area-inset-bottom))]" />
    </div>
  );
}
