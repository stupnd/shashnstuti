"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { deleteThought, sendThought } from "@/lib/actions/thoughts";
import { createClient } from "@/lib/supabase/client";
import {
  emptyThoughts,
  MAX_THOUGHT_LEN,
  parseThoughts,
  THOUGHTS_SESSION_ID,
  type Thought,
  type ThoughtsState,
} from "@/lib/thoughts";
import { Avatar } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";

const QUICK: { label: string; body: string; icon: IconName; color: string }[] = [
  { label: "thinking of you", body: "thinking of you ♡", icon: "heart", color: "var(--pink)" },
  { label: "miss you", body: "miss you a lot", icon: "shy", color: "var(--lilac)" },
  { label: "love you", body: "love you so much", icon: "heartFilled", color: "var(--accent-soft)" },
  { label: "good morning", body: "good morning sunshine", icon: "sun", color: "var(--butter)" },
  { label: "good night", body: "sweet dreams", icon: "moon", color: "var(--sky)" },
  { label: "call me?", body: "call me when you can?", icon: "wave", color: "var(--mint)" },
];

const NOTE_COLORS = ["var(--butter)", "var(--pink)", "var(--mint)", "var(--sky)", "var(--lilac)", "var(--peach)"];

function timeLabel(iso: string) {
  const t = new Date(iso).getTime();
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function tiltFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 3)) % 11;
  return (h - 5) * 0.7;
}

type Person = { id: string; display_name: string; avatar_emoji: string | null };

export function ThoughtsBoard({
  initial,
  me,
  partner,
}: {
  initial: ThoughtsState;
  me: Person;
  partner: Person | null;
}) {
  const [board, setBoard] = useState(initial);
  const [optimistic, addOptimistic] = useOptimistic(board, (cur, next: ThoughtsState) => next);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const nameOf = useCallback(
    (id: string) => {
      if (id === me.id) return me.display_name;
      if (partner?.id === id) return partner.display_name;
      return "someone";
    },
    [me, partner],
  );

  const avatarOf = useCallback(
    (id: string) => {
      if (id === me.id) return me.avatar_emoji;
      if (partner?.id === id) return partner.avatar_emoji;
      return "heart";
    },
    [me, partner],
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("thoughts-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `id=eq.${THOUGHTS_SESSION_ID}` },
        (payload) => {
          const row = payload.new as { state?: unknown } | null;
          if (row?.state) setBoard(parseThoughts(row.state));
          else if (payload.eventType === "DELETE") setBoard(emptyThoughts());
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  function push(body: string) {
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) return;
    const temp: Thought = {
      id: `temp-${crypto.randomUUID()}`,
      author: me.id,
      body: trimmed.slice(0, MAX_THOUGHT_LEN),
      created_at: new Date().toISOString(),
    };
    start(async () => {
      addOptimistic({ items: [temp, ...board.items] });
      const res = await sendThought(trimmed);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setBoard((prev) => ({
        items: [res.thought, ...prev.items.filter((t) => t.id !== res.thought.id)].slice(0, 40),
      }));
      setText("");
    });
  }

  function remove(id: string) {
    start(async () => {
      addOptimistic({ items: board.items.filter((t) => t.id !== id) });
      const res = await deleteThought(id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setBoard((prev) => ({ items: prev.items.filter((t) => t.id !== id) }));
    });
  }

  const today = optimistic.items.filter((t) => {
    const d = new Date(t.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const feed = today.length > 0 ? today : optimistic.items.slice(0, 8);

  return (
    <section className="card relative overflow-hidden p-5" style={{ ["--card-shadow" as string]: "var(--pink)" }}>
      <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-pink/50 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-sky/40 blur-2xl" aria-hidden />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="label">throughout the day</p>
            <h2 className="font-semibold tracking-tight mt-1 text-3xl leading-tight">
              thinking of you
            </h2>
            <p className="mt-1 text-sm text-muted">
              {partner
                ? `little pings for ${partner.display_name} — they show up here live.`
                : "little pings once your person signs in."}
            </p>
          </div>
          <span className="sticker bob h-12 w-12 shrink-0 bg-pink text-accent">
            <Icon name="heartFilled" size={22} />
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              disabled={pending || !partner}
              onClick={() => push(q.body)}
              className="chip text-xs"
              style={{ background: q.color }}
            >
              <Icon name={q.icon} size={14} />
              {q.label}
            </button>
          ))}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            push(text);
          }}
        >
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_THOUGHT_LEN}
            placeholder={partner ? "or type anything…" : "waiting for partner…"}
            disabled={!partner}
            className="input flex-1 py-2.5 text-sm"
            aria-label="Send a thought"
          />
          <button type="submit" disabled={pending || !partner || !text.trim()} className="btn btn-primary shrink-0 px-4">
            <Icon name="sparkle" size={16} />
            send
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-accent" role="alert">{error}</p>}

        <div className="mt-5">
          {feed.length === 0 ? (
            <div className="dashed px-4 py-8 text-center">
              <p className="font-hand text-2xl text-muted">no thoughts yet today</p>
              <p className="label mt-1">tap a chip above — even a tiny one counts</p>
            </div>
          ) : (
            <ul className="stagger-in grid grid-cols-1 gap-3 sm:grid-cols-2">
              {feed.map((t, i) => {
                const mine = t.author === me.id;
                const color = NOTE_COLORS[i % NOTE_COLORS.length]!;
                return (
                  <li
                    key={t.id}
                    className="relative rounded-2xl border-[1.5px] border-line p-3 shadow-[3px_3px_0_var(--note)] transition-transform hover:-translate-y-0.5 hover:rotate-0"
                    style={{
                      background: color,
                      ["--note" as string]: color,
                      transform: `rotate(${tiltFor(t.id)}deg)`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/70">
                      <Avatar value={avatarOf(t.author)} size={12} />
                      <span>{mine ? "you" : nameOf(t.author)}</span>
                      <span className="opacity-50">·</span>
                      <span>{timeLabel(t.created_at)}</span>
                    </div>
                    <p className="font-hand mt-1.5 text-xl leading-snug text-ink">{t.body}</p>
                    {mine && !t.id.startsWith("temp-") && (
                      <button
                        type="button"
                        onClick={() => remove(t.id)}
                        className="tap absolute right-2 top-2 rounded-full p-1 text-ink/40 hover:bg-ink/10 hover:text-ink"
                        aria-label="Take back"
                        title="take back"
                      >
                        <Icon name="close" size={12} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
