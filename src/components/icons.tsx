import type { SVGProps } from "react";

/**
 * Hand-drawn line icons. All 24×24, stroked, round caps. The `rough` SVG
 * filter (defined once in the root layout) gives them a slight ink wobble.
 * Add new ones here; keep them to a few strokes so they read at 20px.
 */
const P = {
  heart: <path d="M12 20.3c-1-.8-7.6-5.3-8.2-9.9C3.4 7.1 5.6 4.9 8 5.1c1.6.1 2.9 1 4 2.6 1.1-1.6 2.4-2.5 4-2.6 2.4-.2 4.6 2 4.2 5.3-.6 4.6-7.2 9.1-8.2 9.9Z" />,
  heartFilled: <path d="M12 20.3c-1-.8-7.6-5.3-8.2-9.9C3.4 7.1 5.6 4.9 8 5.1c1.6.1 2.9 1 4 2.6 1.1-1.6 2.4-2.5 4-2.6 2.4-.2 4.6 2 4.2 5.3-.6 4.6-7.2 9.1-8.2 9.9Z" fill="currentColor" />,
  /** Two overlapping hearts — “double love” reaction. */
  hearts: (
    <>
      <path d="M8.2 18.8c-.8-.6-5.8-4-6.3-7.5C1.6 8.8 3.3 7.1 5.1 7.3c1.2.1 2.2.8 3 2 .9-1.2 1.8-1.9 3-2 1.8-.2 3.5 1.5 3.2 4-.5 3.5-5.5 6.9-6.1 7.5Z" />
      <path d="M15.8 18.8c-.8-.6-5.8-4-6.3-7.5C9.2 8.8 10.9 7.1 12.7 7.3c1.2.1 2.2.8 3 2 .9-1.2 1.8-1.9 3-2 1.8-.2 3.5 1.5 3.2 4-.5 3.5-5.5 6.9-6.1 7.5Z" fill="currentColor" />
    </>
  ),
  star: <path d="M12 3.6l2.5 5.3 5.8.7-4.3 4 1.2 5.8L12 16.6l-5.2 2.8 1.2-5.8-4.3-4 5.8-.7Z" />,
  sparkle: <><path d="M12 3.5c.5 4.4 2.2 6.5 7 7.5-4.8 1-6.5 3.1-7 7.5-.5-4.4-2.2-6.5-7-7.5 4.8-1 6.5-3.1 7-7.5Z" /><path d="M19 3v3M17.5 4.5h3" /></>,
  camera: <><path d="M4.5 8.5h3.2l1.5-2.4h5.6l1.5 2.4h3.2c.6 0 1 .5 1 1V18c0 .6-.4 1-1 1h-15c-.6 0-1-.4-1-1V9.5c0-.5.4-1 1-1Z" /><circle cx="12" cy="13.5" r="3.2" /></>,
  book: <><path d="M4 5.5c2.6-1 5.4-.9 8 .7 2.6-1.6 5.4-1.7 8-.7v13c-2.6-1-5.4-.9-8 .7-2.6-1.6-5.4-1.7-8-.7Z" /><path d="M12 6.2v13" /></>,
  home: <><path d="M4.5 11.5 12 4.8l7.5 6.7" /><path d="M6.5 10v9h11v-9" /><path d="M10 19v-5h4v5" /></>,
  envelope: <><path d="M3.8 7.2h16.4v10.6H3.8Z" /><path d="M4 7.6l8 6.2 8-6.2" /></>,
  pin: <><path d="M12 20.5c-3-3.6-6-7-6-10.2A6 6 0 0 1 18 10.3c0 3.2-3 6.6-6 10.2Z" /><circle cx="12" cy="10.2" r="2.2" /></>,
  /** Thumbtack — pin a photo to home. */
  pushpin: (
    <>
      <path d="M12 21v-6.5" />
      <path d="M9 3.5h6l-.8 6.2H17L12 15.5 7 9.7h2.8Z" />
    </>
  ),
  pushpinFilled: (
    <>
      <path d="M12 21v-6.5" />
      <path d="M9 3.5h6l-.8 6.2H17L12 15.5 7 9.7h2.8Z" fill="currentColor" />
    </>
  ),
  dice: <><rect x="4.5" y="4.5" width="15" height="15" rx="3" /><circle cx="8.5" cy="8.5" r=".9" fill="currentColor" /><circle cx="15.5" cy="8.5" r=".9" fill="currentColor" /><circle cx="12" cy="12" r=".9" fill="currentColor" /><circle cx="8.5" cy="15.5" r=".9" fill="currentColor" /><circle cx="15.5" cy="15.5" r=".9" fill="currentColor" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" /></>,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  back: <path d="M15.5 5.5 9 12l6.5 6.5" />,
  edit: <><path d="M14.5 5.5l4 4L8 20H4v-4Z" /><path d="M12.5 7.5l4 4" /></>,
  trash: <><path d="M5 7h14M9.5 7V4.8h5V7M7 7l.8 12.2h8.4L17 7" /><path d="M10.3 10.5v6M13.7 10.5v6" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  lock: <><rect x="6" y="10.5" width="12" height="9" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  moon: <path d="M15.5 4.2A8 8 0 1 0 19.8 15 6.2 6.2 0 0 1 15.5 4.2Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" /></>,
  cloud: <path d="M7 18.5h10a3.5 3.5 0 0 0 .5-7A5 5 0 0 0 7.8 10 4.2 4.2 0 0 0 7 18.5Z" />,
  flower: <><circle cx="12" cy="12" r="2.3" /><path d="M12 9.7c-1.8-3.5.6-6 2-4.5 1.4-1.5 3.8 1 2 4.5M14.3 12c3.5-1.8 6 .6 4.5 2-1.5 1.4 1 3.8-4.5 2M12 14.3c1.8 3.5-.6 6-2 4.5-1.4 1.5-3.8-1-2-4.5M9.7 12c-3.5 1.8-6-.6-4.5-2 1.5-1.4-1-3.8 4.5-2" /></>,
  rainbow: <><path d="M3.5 17a8.5 8.5 0 0 1 17 0" /><path d="M7 17a5 5 0 0 1 10 0" /><path d="M10.3 17a1.7 1.7 0 0 1 3.4 0" /></>,
  bear: <><circle cx="12" cy="13" r="6.5" /><circle cx="6.8" cy="7.2" r="2.2" /><circle cx="17.2" cy="7.2" r="2.2" /><circle cx="9.8" cy="12" r=".7" fill="currentColor" /><circle cx="14.2" cy="12" r=".7" fill="currentColor" /><path d="M11 15c.6.6 1.4.6 2 0" /></>,
  bunny: <><ellipse cx="12" cy="14.5" rx="5.5" ry="5" /><path d="M9.5 9.8C8.5 6.5 8.5 3.5 10 3.4c1.2 0 1.6 3 1.5 6M14.5 9.8c1-3.3 1-6.3-.5-6.4-1.2 0-1.6 3-1.5 6" /><circle cx="10" cy="14" r=".7" fill="currentColor" /><circle cx="14" cy="14" r=".7" fill="currentColor" /><path d="M11.2 16.4c.5.4 1.1.4 1.6 0" /></>,
  cat: <><path d="M6 9.5 5.5 4l4 2.5h5l4-2.5-.5 5.5a6.5 6.5 0 1 1-12 0Z" /><circle cx="9.8" cy="12.5" r=".7" fill="currentColor" /><circle cx="14.2" cy="12.5" r=".7" fill="currentColor" /><path d="M11 15.2c.6.5 1.4.5 2 0M4 14h3M17 14h3" /></>,
  strawberry: <><path d="M12 8.5c3.5 0 5.5 2 5.5 4.5 0 3.5-3 7-5.5 7s-5.5-3.5-5.5-7c0-2.5 2-4.5 5.5-4.5Z" /><path d="M12 8.5c-1-2-3-2.4-4-1.7 1 .3 2 .8 2.5 1.7M12 8.5c1-2 3-2.4 4-1.7-1 .3-2 .8-2.5 1.7M12 8.5V5.5" /><path d="M10 13h.01M14 13.5h.01M12 16h.01" strokeWidth="2" /></>,
  fire: <path d="M12 20c-3.5 0-6-2.4-6-5.6 0-2.8 2-4.6 3-6.4.6 1.2 1 2 2 2.5.3-2.5 1.2-5 3.2-6.5-.2 2.5 1.2 3.8 2.4 5.6.8 1.2 1.4 2.6 1.4 4.8 0 3.2-2.5 5.6-6 5.6Z" />,
  eyes: <><ellipse cx="8" cy="12" rx="3.3" ry="4.2" /><ellipse cx="16" cy="12" rx="3.3" ry="4.2" /><circle cx="8.8" cy="12.5" r="1.3" fill="currentColor" /><circle cx="16.8" cy="12.5" r="1.3" fill="currentColor" /></>,
  wave: <path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />,
  // moods
  happy: <><circle cx="12" cy="12" r="8" /><circle cx="9" cy="10.5" r=".8" fill="currentColor" /><circle cx="15" cy="10.5" r=".8" fill="currentColor" /><path d="M8.5 14c1.8 2.2 5.2 2.2 7 0" /></>,
  laugh: <><circle cx="12" cy="12" r="8" /><path d="M7.5 10.5 9 9l1.5 1.5M13.5 10.5 15 9l1.5 1.5" /><path d="M8 13.5c.5 3 7.5 3 8 0Z" /></>,
  teary: <><circle cx="12" cy="12" r="8" /><circle cx="9" cy="10.5" r="1" fill="currentColor" /><circle cx="15" cy="10.5" r="1" fill="currentColor" /><path d="M10 15c1.2 1 2.8 1 4 0" /><path d="M16.5 12c-.7 1.2-.7 2.4 0 2.6.7-.2.7-1.4 0-2.6Z" fill="currentColor" /></>,
  calm: <><circle cx="12" cy="12" r="8" /><path d="M7.5 10.5c1 1 2.2 1 3 0M13.5 10.5c1 1 2.2 1 3 0" /><path d="M9.5 14.5c1.5 1.2 3.5 1.2 5 0" /></>,
  starry: <><circle cx="12" cy="12" r="8" /><path d="M8.5 8.2l.6 1.3 1.4.2-1 1 .2 1.4-1.2-.7-1.2.7.2-1.4-1-1 1.4-.2ZM15.5 8.2l.6 1.3 1.4.2-1 1 .2 1.4-1.2-.7-1.2.7.2-1.4-1-1 1.4-.2Z" /><path d="M8.5 14.5c1.8 2 5.2 2 7 0" /></>,
  party: <><circle cx="12" cy="13" r="7" /><path d="M9.5 6.5 12 2l2.5 4.5" /><circle cx="9.5" cy="12" r=".8" fill="currentColor" /><circle cx="14.5" cy="12" r=".8" fill="currentColor" /><path d="M9 15c1.5 1.8 4.5 1.8 6 0" /><path d="M18 5l1 1M20 8h1M4 7l-1-1" /></>,
  sleepy: <><circle cx="12" cy="13" r="7.5" /><path d="M8 12.5c1 .8 2 .8 3 0M13 12.5c1 .8 2 .8 3 0" /><path d="M10.5 16h3" /><path d="M16 4h3l-3 3h3" /></>,
  shy: <><circle cx="12" cy="12" r="8" /><circle cx="9" cy="10.5" r=".8" fill="currentColor" /><circle cx="15" cy="10.5" r=".8" fill="currentColor" /><path d="M10.5 14.5c1 .8 2 .8 3 0" /><path d="M5.5 13h2M16.5 13h2" /></>,
  melt: <><path d="M4.5 12a7.5 7.5 0 0 1 15 0c0 2.5-1.5 4-1.5 6s2 3 0 3-2.5-3-4.5-3-2.5 2.5-4 2.5S8.5 18 7 18s-2.5-3-2.5-6Z" /><circle cx="9.5" cy="10.5" r=".8" fill="currentColor" /><circle cx="14.5" cy="11" r=".8" fill="currentColor" /><path d="M9.5 14c1 .8 2.2 1 3.5.2" /></>,
  cry: <><circle cx="12" cy="12" r="8" /><circle cx="9" cy="10.5" r=".9" fill="currentColor" /><circle cx="15" cy="10.5" r=".9" fill="currentColor" /><path d="M9.5 16c1.5-1.4 3.5-1.4 5 0" /><path d="M8 12.5v4M16 12.5v4" /></>,
  hug: <><path d="M5 13c0-3 1.5-5 4-5s3 2 3 4M19 13c0-3-1.5-5-4-5s-3 2-3 4" /><path d="M6 13.5c1 3 3.5 5 6 5s5-2 6-5" /></>,
} as const;

export type IconName = keyof typeof P;
export const ICON_NAMES = Object.keys(P) as IconName[];

export function Icon({
  name,
  size = 22,
  strokeWidth = 1.6,
  className = "",
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  const node = P[name] ?? P.heart;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`doodle inline-block shrink-0 ${className}`}
      aria-hidden
      {...rest}
    >
      {node}
    </svg>
  );
}

/** Define once near the top of <body>. Gives .doodle strokes an ink wobble. */
export function RoughFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <filter id="rough" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.1" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/* ---- Curated sets used by pickers ---------------------------------------- */

export const AVATARS: IconName[] = ["heart", "star", "moon", "sun", "cloud", "flower", "rainbow", "bear", "bunny", "cat", "strawberry", "sparkle"];

export const MOODS: { key: IconName; label: string }[] = [
  { key: "happy", label: "happy" },
  { key: "laugh", label: "laughing" },
  { key: "teary", label: "teary" },
  { key: "calm", label: "calm" },
  { key: "starry", label: "starstruck" },
  { key: "party", label: "party" },
  { key: "sleepy", label: "sleepy" },
  { key: "shy", label: "shy" },
  { key: "melt", label: "melting" },
  { key: "rainbow", label: "rainbow" },
];

export const REACTIONS: IconName[] = ["heart", "hearts", "laugh", "teary", "starry", "fire", "hug", "cry", "eyes"];

/** Older rows may hold emoji; map the common ones onto icons. */
const EMOJI_TO_ICON: Record<string, IconName> = {
  "🤍": "heart", "🩷": "heart", "❤️": "heart", "💗": "heart", "💙": "heart",
  "💕": "hearts", "💞": "hearts", "💖": "hearts",
  "😂": "laugh", "🥹": "teary", "😌": "calm", "🤩": "starry", "🥳": "party",
  "😴": "sleepy", "🤭": "shy", "🫠": "melt", "🌈": "rainbow", "🥰": "happy",
  "😍": "starry", "🔥": "fire", "🫶": "hug", "😭": "cry", "👀": "eyes",
  "⭐": "star", "✨": "sparkle", "🌙": "moon", "☁️": "cloud", "🌷": "flower",
  "🐻": "bear", "🐰": "bunny", "🐱": "cat", "🍓": "strawberry", "🧸": "bear",
};

export function iconFor(value: string | null | undefined, fallback: IconName = "heart"): IconName {
  if (!value) return fallback;
  if (value in P) return value as IconName;
  return EMOJI_TO_ICON[value] ?? fallback;
}
