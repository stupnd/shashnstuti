"use client";

import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import { addWish, deleteWish, scheduleWish, toggleWishDone } from "@/lib/actions/planner";
import { createClient } from "@/lib/supabase/client";
import type { Wish, WishKind } from "@/lib/database.types";
import { todayDateOnly } from "@/lib/dates";
import { hostLabel, MAX_WISH_TITLE, sortWishes, WISH_KINDS } from "@/lib/planner";
import { Icon, type IconName } from "@/components/icons";
import { Avatar } from "@/components/ui";

const KIND_ICON: Record<WishKind, IconName> = { present: "gift", date: "bulb" };

const PLACEHOLDER: Record<WishKind, string> = {
  date: "a restaurant, a place, anything…",
  present: "something they'd love…",
};

const NOTE_COLORS = ["var(--butter)", "var(--peach)", "var(--pink)", "var(--mint)", "var(--sky)", "var(--lilac)"];

function tiltFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 3)) % 11;
  return (h - 5) * 0.55;
}

type Person = { id: string; display_name: string; avatar_emoji: string | null };

export function Wishlist({
  initial,
  me,
  partner,
}: {
  initial: Wish[];
  me: Person;
  partner: Person | null;
}) {
  const [wishes, setWishes] = useState<Wish[]>(initial);
  const [kind, setKind] = useState<WishKind>("date");
  const [title, setTitle] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [forId, setForId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Live: an idea jotted on one phone shows up on the other.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("planner-wishes")
      .on("postgres_changes", { event: "*", schema: "public", table: "wishes" }, (payload) => {
        setWishes((cur) => {
          if (payload.eventType === "DELETE") {
            const gone = (payload.old as Partial<Wish>)?.id;
            return gone ? cur.filter((w) => w.id !== gone) : cur;
          }
          const row = payload.new as Wish;
          if (!row?.id) return cur;
          return sortWishes([...cur.filter((w) => w.id !== row.id), row]);
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const sorted = useMemo(() => sortWishes(wishes), [wishes]);
  const ofKind = sorted.filter((w) => w.kind === kind);
  const open = ofKind.filter((w) => !w.done_at);
  const done = ofKind.filter((w) => w.done_at);
  const visible = showDone ? [...open, ...done] : open;

  const nameOf = (id: string | null) => {
    if (!id) return "us";
    if (id === me.id) return "you";
    return partner?.id === id ? partner.display_name : "someone";
  };
  const avatarOf = (id: string) =>
    id === me.id ? me.avatar_emoji : partner?.id === id ? partner.avatar_emoji : "heart";

  function reset() {
    setTitle("");
    setUrl("");
    setNote("");
    setForId(null);
    setShowDetails(false);
  }

  function submit() {
    setError(null);
    const trimmed = title.trim();
    if (!trimmed) return;

    const temp: Wish = {
      id: `temp-${crypto.randomUUID()}`,
      kind,
      title: trimmed.slice(0, MAX_WISH_TITLE),
      note: note.trim(),
      url: url.trim() || null,
      for_id: forId,
      created_by: me.id,
      done_at: null,
      done_by: null,
      created_at: new Date().toISOString(),
    };
    start(async () => {
      setWishes((cur) => [temp, ...cur]);
      const res = await addWish({ kind, title: trimmed, note, url, forId });
      if ("error" in res) {
        setWishes((cur) => cur.filter((w) => w.id !== temp.id));
        setError(res.error);
        return;
      }
      setWishes((cur) => sortWishes([res.wish, ...cur.filter((w) => w.id !== temp.id && w.id !== res.wish.id)]));
      reset();
    });
  }

  function tick(wish: Wish) {
    const next = !wish.done_at;
    start(async () => {
      setWishes((cur) =>
        cur.map((w) =>
          w.id === wish.id ? { ...w, done_at: next ? new Date().toISOString() : null, done_by: next ? me.id : null } : w,
        ),
      );
      const res = await toggleWishDone(wish.id, next);
      if ("error" in res) {
        setWishes((cur) => cur.map((w) => (w.id === wish.id ? wish : w)));
        setError(res.error);
      }
    });
  }

  function remove(wish: Wish) {
    start(async () => {
      setWishes((cur) => cur.filter((w) => w.id !== wish.id));
      const res = await deleteWish(wish.id);
      if ("error" in res) {
        setWishes((cur) => sortWishes([...cur, wish]));
        setError(res.error);
      }
    });
  }

  function schedule(wish: Wish, date: string) {
    if (!date) return;
    setError(null);
    start(async () => {
      const res = await scheduleWish(wish.id, date);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      // scheduleWish ticks the idea off; realtime will confirm, but be instant.
      setWishes((cur) =>
        cur.map((w) => (w.id === wish.id ? { ...w, done_at: new Date().toISOString(), done_by: me.id } : w)),
      );
      setScheduling(null);
    });
  }

  const active = WISH_KINDS.find((k) => k.key === kind)!;

  return (
    <div className="space-y-5">
      {/* ---- jot one down ------------------------------------------------ */}
      <section className="card relative overflow-hidden p-4 sm:p-5" style={{ ["--card-shadow" as string]: active.color }}>
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-butter/40 blur-2xl" aria-hidden />

        <div className="relative">
          <div className="flex gap-2">
            {WISH_KINDS.map((k) => {
              const count = sorted.filter((w) => w.kind === k.key && !w.done_at).length;
              return (
                <button
                  key={k.key}
                  type="button"
                  aria-pressed={kind === k.key}
                  onClick={() => {
                    setKind(k.key);
                    setScheduling(null);
                  }}
                  className="chip flex-1 py-2 text-xs"
                  style={kind === k.key ? undefined : ({ background: k.color } as CSSProperties)}
                >
                  <Icon name={KIND_ICON[k.key]} size={14} />
                  {k.plural}
                  {count > 0 && <span className="opacity-60">{count}</span>}
                </button>
              );
            })}
          </div>

          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="flex gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => setShowDetails(true)}
                maxLength={MAX_WISH_TITLE}
                placeholder={PLACEHOLDER[kind]}
                className="input flex-1 py-2.5 text-sm"
                aria-label={`Add a ${active.label}`}
              />
              <button type="submit" disabled={pending || !title.trim()} className="btn btn-primary shrink-0 px-4">
                <Icon name="plus" size={16} strokeWidth={2.4} />
                <span className="sr-only sm:not-sr-only">add</span>
              </button>
            </div>

            {showDetails && (
              <div className="animate-fade-up space-y-2">
                {kind === "present" && (
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="a link, if you found one"
                    className="input py-2.5 text-sm"
                    aria-label="Link"
                  />
                )}
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={240}
                  placeholder="why / size / any detail"
                  className="input py-2.5 text-sm"
                  aria-label="Note"
                />
                {kind === "present" && partner && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="label self-center">for</span>
                    {[
                      { id: null, label: "us" },
                      { id: partner.id, label: partner.display_name },
                      { id: me.id, label: "me" },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        aria-pressed={forId === opt.id}
                        onClick={() => setForId(opt.id)}
                        className="chip px-2.5 py-1 text-xs"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>

          {error && <p className="mt-2 text-sm text-accent" role="alert">{error}</p>}
        </div>
      </section>

      {/* ---- the list ---------------------------------------------------- */}
      {visible.length === 0 ? (
        <div className="dashed px-4 py-10 text-center">
          <span className="sticker bob mx-auto mb-3 flex h-14 w-14 text-accent" style={{ background: active.color }}>
            <Icon name={KIND_ICON[kind]} size={26} />
          </span>
          <p className="font-hand text-2xl text-muted">
            {kind === "present" ? "no present ideas yet" : "no date ideas yet"}
          </p>
          <p className="label mt-1">jot one down the second you think of it</p>
        </div>
      ) : (
        <ul className="stagger-in space-y-2.5">
          {visible.map((w, i) => {
            const isDone = Boolean(w.done_at);
            const color = NOTE_COLORS[i % NOTE_COLORS.length]!;
            const temp = w.id.startsWith("temp-");
            return (
              <li
                key={w.id}
                className="relative rounded-2xl border-2 border-ink p-3 transition-transform hover:-translate-y-0.5 hover:rotate-0"
                style={{
                  background: isDone ? "var(--bg-soft)" : color,
                  boxShadow: `3px 3px 0 ${isDone ? "var(--line)" : "var(--ink)"}`,
                  transform: `rotate(${tiltFor(w.id)}deg)`,
                  opacity: isDone ? 0.65 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => tick(w)}
                    disabled={temp}
                    aria-pressed={isDone}
                    aria-label={isDone ? "Put it back on the list" : kind === "present" ? "Got it" : "Did it"}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface text-accent transition-transform hover:scale-110"
                  >
                    {isDone && <Icon name="check" size={13} strokeWidth={2.6} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={`font-hand text-xl leading-snug text-ink ${isDone ? "line-through decoration-2" : ""}`}>
                      {w.title}
                    </p>
                    {w.note && <p className="mt-0.5 text-sm text-ink/70">{w.note}</p>}

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/60">
                      <span className="inline-flex items-center gap-1">
                        <Avatar value={avatarOf(w.created_by)} size={11} />{" "}
                        {w.created_by === me.id ? "you" : nameOf(w.created_by)}
                      </span>
                      {w.kind === "present" && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="gift" size={11} /> for {nameOf(w.for_id)}
                        </span>
                      )}
                      {w.url && (
                        <a
                          href={w.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 normal-case tracking-normal underline decoration-dotted hover:text-ink"
                        >
                          <Icon name="star" size={11} /> {hostLabel(w.url)}
                        </a>
                      )}
                    </div>

                    {w.kind === "date" && !isDone && !temp && (
                      scheduling === w.id ? (
                        <div className="mt-2.5 flex items-center gap-2">
                          <input
                            type="date"
                            min={todayDateOnly()}
                            autoFocus
                            onChange={(e) => schedule(w, e.target.value)}
                            className="input py-1.5 text-xs"
                            aria-label="Pick a day for this idea"
                          />
                          <button
                            type="button"
                            onClick={() => setScheduling(null)}
                            className="btn btn-ghost px-2 py-1 text-xs"
                          >
                            cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setScheduling(w.id)}
                          className="chip mt-2.5 bg-surface px-2.5 py-1 text-xs"
                        >
                          <Icon name="calendar" size={12} /> put it on the calendar
                        </button>
                      )
                    )}
                  </div>

                  {!temp && (
                    <button
                      type="button"
                      onClick={() => remove(w)}
                      className="shrink-0 rounded-full p-1 text-ink/40 hover:bg-ink/10 hover:text-ink"
                      aria-label="Remove"
                      title="remove"
                    >
                      <Icon name="close" size={13} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <button
          type="button"
          onClick={() => setShowDone((s) => !s)}
          className="label inline-flex items-center gap-1 hover:text-ink"
        >
          <Icon name="check" size={12} />
          {showDone ? "hide" : "show"} {done.length} {kind === "present" ? "already got" : "already done"}
        </button>
      )}
    </div>
  );
}
