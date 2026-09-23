"use client";

import Link from "next/link";
import { useEffect, useId, useState, type CSSProperties } from "react";
import { Icon, type IconName } from "./icons";

const STORAGE_KEY = "scrapbook-onboarding-seen";
const OPEN_EVENT = "scrapbook-onboarding-open";

type Feature = {
  icon: IconName;
  label: string;
  blurb: string;
  color: string;
  href?: string;
};

const TABS: Feature[] = [
  { icon: "home", label: "home", blurb: "day counter, thoughts & shortcuts", color: "var(--butter)", href: "/" },
  { icon: "book", label: "our book", blurb: "the timeline of every moment", color: "var(--mint)", href: "/timeline" },
  { icon: "plus", label: "add", blurb: "drop a new photo + note", color: "var(--accent)", href: "/new" },
  { icon: "envelope", label: "letters", blurb: "sealed notes that open on time", color: "var(--sky)", href: "/letters" },
  { icon: "pin", label: "map", blurb: "places pinned from your moments", color: "var(--lilac)", href: "/map" },
  { icon: "sparkle", label: "wrapped", blurb: "a year-in-review slideshow", color: "var(--peach)", href: "/wrapped" },
];

const EXTRAS: Feature[] = [
  { icon: "pushpin", label: "pin", blurb: "pick favorite photos for home", color: "var(--peach)", href: "/pins" },
  { icon: "edit", label: "thoughts", blurb: "sticky “thinking of you” pings", color: "var(--pink)", href: "/" },
  { icon: "sparkle", label: "watch", blurb: "fullscreen story slideshow", color: "var(--sky)", href: "/watch" },
  { icon: "heart", label: "flip", blurb: "shuffle a deck of memories", color: "var(--mint)", href: "/flip" },
  { icon: "dice", label: "play", blurb: "games nights, live together", color: "var(--butter)", href: "/play" },
  { icon: "eyes", label: "ask", blurb: "ask the book about your story", color: "var(--lilac)", href: "/ask" },
];

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

function wasSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

/** Open the intro again (e.g. from settings). */
export function replayOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function ReplayOnboardingButton() {
  return (
    <button type="button" className="btn btn-soft w-full" onClick={replayOnboarding}>
      <Icon name="sparkle" size={18} />
      replay the intro
    </button>
  );
}

function FeatureRow({ feature, onPick }: { feature: Feature; onPick: () => void }) {
  const inner = (
    <>
      <span className="sticker h-10 w-10 shrink-0" style={{ background: feature.color }}>
        <Icon name={feature.icon} size={18} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold leading-tight">{feature.label}</span>
        <span className="block text-xs text-muted">{feature.blurb}</span>
      </span>
    </>
  );

  if (feature.href) {
    return (
      <Link
        href={feature.href}
        transitionTypes={["nav-forward"]}
        onClick={onPick}
        className="flex items-center gap-3 rounded-2xl border-[1.5px] border-line bg-surface px-3 py-2.5 shadow-[3px_3px_0_var(--row)] transition-transform hover:-translate-y-0.5"
        style={{ ["--row" as string]: feature.color }}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border-[1.5px] border-line bg-surface px-3 py-2.5 shadow-[3px_3px_0_var(--row)]"
      style={{ ["--row" as string]: feature.color }}
    >
      {inner}
    </div>
  );
}

export function Onboarding({ name }: { name: string }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!wasSeen()) setOpen(true);
    const onOpen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const finish = () => {
    markSeen();
    setOpen(false);
  };

  const next = () => {
    if (step >= 2) finish();
    else setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const greet = name.trim() || "you";

  return (
    <div
      className="fixed inset-0 z-[50] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        aria-label="Close intro"
        onClick={finish}
      />

      <div
        className="card soft-glow relative z-10 flex max-h-[min(88dvh,40rem)] w-full max-w-md flex-col overflow-hidden animate-fade-up"
        style={{ ["--card-shadow" as string]: "var(--pink)" } as CSSProperties}
      >
        <div className="flex items-center justify-between gap-2 border-b-2 border-ink/10 px-4 py-3">
          <p className="label">intro · {step + 1} / 3</p>
          <button type="button" className="btn btn-ghost h-9 w-9 rounded-full p-0" aria-label="Skip intro" onClick={finish}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {step === 0 && (
            <div className="text-center">
              <span className="sticker bob mx-auto h-16 w-16 bg-pink text-accent">
                <Icon name="heart" size={30} strokeWidth={2.2} />
              </span>
              <h2 id={titleId} className="font-semibold tracking-tight mt-4 text-[2rem] leading-tight sm:text-[2.35rem]">
                hi {greet}!
              </h2>
              <p className="font-semibold tracking-tight mt-2 text-2xl leading-tight text-ink/90">welcome to our scrapbook</p>
              <p className="mx-auto mt-3 max-w-xs text-sm text-muted">
                a private little book for the two of you — moments, letters, maps, games, and more.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 id={titleId} className="font-semibold tracking-tight text-[1.85rem] leading-tight">
                the main spots
              </h2>
              <p className="label mt-2">along the bottom bar</p>
              <div className="stagger-in mt-4 grid gap-2.5">
                {TABS.map((f) => (
                  <FeatureRow key={f.label} feature={f} onPick={finish} />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 id={titleId} className="font-semibold tracking-tight text-[1.85rem] leading-tight">
                play &amp; peek
              </h2>
              <p className="label mt-2">extra treats from home</p>
              <div className="stagger-in mt-4 grid gap-2.5">
                {EXTRAS.map((f) => (
                  <FeatureRow key={f.label} feature={f} onPick={finish} />
                ))}
              </div>
              <p className="mt-5 text-center text-sm text-muted">
                tap around anytime — you can replay this from settings.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t-2 border-ink/10 px-4 py-3">
          {step > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={back}>
              back
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={finish}>
              skip
            </button>
          )}
          <div className="flex flex-1 items-center justify-center gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${i === step ? "w-5 bg-accent" : "w-2 bg-line"}`}
              />
            ))}
          </div>
          <button type="button" className="btn btn-primary" onClick={next}>
            {step === 2 ? (
              <>
                let&apos;s go <Icon name="heartFilled" size={16} />
              </>
            ) : (
              "next"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
