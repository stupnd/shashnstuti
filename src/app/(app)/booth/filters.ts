/**
 * Booth looks.
 *
 * Each look exists twice on purpose: a CSS filter for the live preview, and a
 * real grade for the captured frame — canvas can't read a CSS filter, and the
 * preview has to promise what the printed strip delivers.
 *
 * The grade is a small film pipeline rather than a channel tweak:
 *   tone curve → saturation → split tone → black lift → halation → grain → vignette
 * Split toning (cool shadows, warm highlights) and halation are what actually
 * make a digital frame read as film; contrast alone just looks like contrast.
 */
export type FilterId = "vintage" | "noir" | "faded" | "color" | "redscale";

type RGB = [number, number, number];

type Grade = {
  /** 0 = linear, 1 = a hard filmic S-curve. */
  contrast: number;
  /** 0 = monochrome, 1 = untouched, >1 = punchier. */
  saturation: number;
  /** Raises the blacks for a matte, printed finish. 0–1. */
  lift: number;
  /** Overall exposure multiplier. */
  gain: number;
  /** Colour pushed into the darks, and into the brights. */
  shadowTint: RGB;
  highlightTint: RGB;
  /** Film grain, 0–1. Rendered coarse, not per-pixel. */
  grain: number;
  /** Glow bleeding out of the highlights, 0–1. */
  halation: number;
  vignette: number;
};

export type Look = {
  id: FilterId;
  label: string;
  /** Paper stock the strip prints onto. */
  paper: string;
  ink: string;
  css: string;
  grade: Grade;
};

const clamp = (n: number) => (n < 0 ? 0 : n > 255 ? 255 : n);
const lumOf = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Filmic S-curve, blended against linear by `amount`. */
function toneCurve(amount: number): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const s = 4 + amount * 8;
  const at = (x: number) => 1 / (1 + Math.exp(-s * (x - 0.5)));
  const lo = at(0);
  const hi = at(1);
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    const curved = (at(x) - lo) / (hi - lo);
    lut[i] = Math.round(255 * (x * (1 - amount) + curved * amount));
  }
  return lut;
}

/** Coarse monochrome grain: noise at half size, scaled up so it isn't pixel hash. */
function grainLayer(w: number, h: number, strength: number): HTMLCanvasElement {
  const gw = Math.max(1, Math.round(w / 2));
  const gh = Math.max(1, Math.round(h / 2));
  const c = document.createElement("canvas");
  c.width = gw;
  c.height = gh;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(gw, gh);
  const d = img.data;
  const amp = 70 * strength;
  for (let i = 0; i < d.length; i += 4) {
    const n = 128 + (Math.random() - 0.5) * amp;
    d[i] = d[i + 1] = d[i + 2] = n;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Blurred copy of just the bright areas, screened back over the frame. */
function halationLayer(src: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // Keep only what's well above mid-grey, ramped in softly.
    const l = lumOf(d[i], d[i + 1], d[i + 2]);
    const k = l < 170 ? 0 : (l - 170) / 85;
    d[i] = clamp(d[i] * k);
    d[i + 1] = clamp(d[i + 1] * k * 0.72); // warm the bloom, like film
    d[i + 2] = clamp(d[i + 2] * k * 0.55);
  }
  ctx.putImageData(img, 0, 0);

  const blurred = document.createElement("canvas");
  blurred.width = w;
  blurred.height = h;
  const bctx = blurred.getContext("2d")!;
  bctx.filter = `blur(${Math.max(2, Math.round(w / 60))}px)`;
  bctx.drawImage(c, 0, 0);
  return blurred;
}

/** Run a frame through a look, in place. */
export function applyGrade(ctx: CanvasRenderingContext2D, w: number, h: number, g: Grade) {
  const lut = toneCurve(g.contrast);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    let r = lut[clamp(d[i] * g.gain) | 0];
    let gr = lut[clamp(d[i + 1] * g.gain) | 0];
    let b = lut[clamp(d[i + 2] * g.gain) | 0];

    // Saturation, pulled toward/away from luminance.
    const l = lumOf(r, gr, b);
    r = l + (r - l) * g.saturation;
    gr = l + (gr - l) * g.saturation;
    b = l + (b - l) * g.saturation;

    // Split tone: shadows one way, highlights the other.
    const t = l / 255;
    const sw = (1 - t) * (1 - t);
    const hw = t * t;
    r += g.shadowTint[0] * sw + g.highlightTint[0] * hw;
    gr += g.shadowTint[1] * sw + g.highlightTint[1] * hw;
    b += g.shadowTint[2] * sw + g.highlightTint[2] * hw;

    // Matte finish — blacks never reach zero on a print.
    const lift = g.lift * 255;
    d[i] = clamp(r * (1 - g.lift) + lift);
    d[i + 1] = clamp(gr * (1 - g.lift) + lift);
    d[i + 2] = clamp(b * (1 - g.lift) + lift);
  }
  ctx.putImageData(img, 0, 0);

  if (g.halation > 0) {
    const glow = halationLayer(ctx.canvas, w, h);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = g.halation;
    ctx.drawImage(glow, 0, 0);
    ctx.restore();
  }

  if (g.grain > 0) {
    const grain = grainLayer(w, h, g.grain);
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.5 + g.grain * 0.3;
    ctx.drawImage(grain, 0, 0, w, h);
    ctx.restore();
  }

  if (g.vignette > 0) {
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.28, w / 2, h / 2, h * 0.85);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(28,18,10,${g.vignette})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}

export const FILTERS: Look[] = [
  {
    id: "vintage",
    label: "vintage",
    paper: "#f3e9d5",
    ink: "#4a3320",
    css: "sepia(0.32) saturate(0.9) contrast(1.06) brightness(1.06)",
    grade: {
      // Warm and sunlit. Held back from full desaturation because skin goes
      // grey-green long before the rest of the frame reads as "old".
      contrast: 0.3, saturation: 0.8, lift: 0.08, gain: 1.1,
      shadowTint: [14, 5, -8], highlightTint: [34, 18, -10],
      grain: 0.3, halation: 0.3, vignette: 0.3,
    },
  },
  {
    id: "noir",
    label: "noir",
    paper: "#efece6",
    ink: "#23201c",
    css: "grayscale(1) contrast(1.18) brightness(0.98)",
    grade: {
      // Gain under 1 protects the highlights — a hard curve on a bright room
      // clips faces to paper white almost immediately.
      contrast: 0.42, saturation: 0, lift: 0.07, gain: 0.94,
      shadowTint: [-3, -1, 5], highlightTint: [4, 4, 6],
      grain: 0.34, halation: 0.14, vignette: 0.42,
    },
  },
  {
    id: "faded",
    label: "faded",
    paper: "#f6f1e8",
    ink: "#5b5142",
    css: "saturate(0.78) contrast(0.9) brightness(1.08) sepia(0.12)",
    grade: {
      contrast: 0.2, saturation: 0.98, lift: 0.17, gain: 1.06,
      shadowTint: [-5, 3, 12], highlightTint: [22, 12, -4],
      grain: 0.22, halation: 0.22, vignette: 0.18,
    },
  },
  {
    id: "color",
    label: "colour",
    paper: "#fbf7ef",
    ink: "#3a3330",
    css: "saturate(1.12) contrast(1.06)",
    grade: {
      contrast: 0.32, saturation: 1.14, lift: 0.03, gain: 1.03,
      shadowTint: [-3, 0, 6], highlightTint: [8, 4, -2],
      grain: 0.08, halation: 0.14, vignette: 0.14,
    },
  },
  {
    id: "redscale",
    label: "sunburn",
    paper: "#f7e6d6",
    ink: "#6b2f1c",
    css: "sepia(0.6) saturate(1.7) hue-rotate(-22deg) contrast(1.02) brightness(1.1)",
    grade: {
      // Bright and orange, not dark and brown — redscale overexposes.
      contrast: 0.15, saturation: 0.75, lift: 0.16, gain: 1.3,
      shadowTint: [42, 6, -20], highlightTint: [62, 24, -34],
      grain: 0.24, halation: 0.34, vignette: 0.24,
    },
  },
];

export const lookFor = (id: FilterId) => FILTERS.find((f) => f.id === id) ?? FILTERS[0];
