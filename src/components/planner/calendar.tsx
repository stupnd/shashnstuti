"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { addPlan, deletePlan, togglePlanDone, updatePlan } from "@/lib/actions/planner";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/database.types";
import { formatLongDate, fromDateOnly } from "@/lib/dates";
import {
  addMonths,
  countdownLabel,
  formatTime,
  groupByDate,
  isAnniversaryDay,
  MAX_PLAN_TITLE,
  monthLabel,
  monthGrid,
  sortPlans,
  toTimeInput,
  upcomingPlans,
} from "@/lib/planner";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui";

const WEEKDAYS = ["s", "m", "t", "w", "t", "f", "s"];
const DAY_COLORS = ["var(--sky)", "var(--mint)", "var(--lilac)", "var(--peach)"];

/** A stable pastel per day, so the same date is always the same colour. */
function colorFor(date: string) {
  let h = 0;
  for (let i = 0; i < date.length; i++) h = (h + date.charCodeAt(i) * (i + 2)) % DAY_COLORS.length;
  return DAY_COLORS[h]!;
}

type Person = { id: string; display_name: string; avatar_emoji: string | null };

export function PlannerCalendar({
  initial,
  today,
  startDate,
  me,
  people,
}: {
  initial: Plan[];
  today: string;
  /** settings.start_date — used to mark the anniversary square. */
  startDate: string;
  me: Person;
  people: Person[];
}) {
  const [plans, setPlans] = useState<Plan[]>(initial);
  const [month, setMonth] = useState<Date>(() => {
    const d = fromDateOnly(today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string>(today);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Live: a date added on one phone lands on the other.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("planner-plans")
      .on("postgres_changes", { event: "*", schema: "public", table: "plans" }, (payload) => {
        setPlans((cur) => {
          if (payload.eventType === "DELETE") {
            const gone = (payload.old as Partial<Plan>)?.id;
            return gone ? cur.filter((p) => p.id !== gone) : cur;
          }
          const row = payload.new as Plan;
          if (!row?.id) return cur;
          const without = cur.filter((p) => p.id !== row.id);
          return sortPlans([...without, row]);
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const byDate = useMemo(() => groupByDate(sortPlans(plans)), [plans]);
  const grid = useMemo(() => monthGrid(month), [month]);
  const upcoming = useMemo(() => upcomingPlans(plans, today).slice(0, 4), [plans, today]);
  const selectedPlans = byDate.get(selected) ?? [];

  const nameOf = (id: string) =>
    id === me.id ? "you" : people.find((p) => p.id === id)?.display_name ?? "someone";
  const avatarOf = (id: string) =>
    people.find((p) => p.id === id)?.avatar_emoji ?? "heart";

  function jumpTo(date: string) {
    const d = fromDateOnly(date);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelected(date);
    setAdding(false);
    setEditing(null);
  }

  function submit(form: FormData) {
    setError(null);
    const title = String(form.get("title") ?? "").trim();
    const time = String(form.get("time") ?? "").trim();
    const place = String(form.get("place") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();
    if (!title) {
      setError("give the date a name");
      return;
    }
    const temp: Plan = {
      id: `temp-${crypto.randomUUID()}`,
      date: selected,
      at_time: time ? `${time}:00` : null,
      title,
      note,
      place: place || null,
      created_by: me.id,
      done_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    start(async () => {
      setPlans((cur) => sortPlans([...cur, temp]));
      const res = await addPlan({ date: selected, title, time, place, note });
      if ("error" in res) {
        setPlans((cur) => cur.filter((p) => p.id !== temp.id));
        setError(res.error);
        return;
      }
      setPlans((cur) => sortPlans([...cur.filter((p) => p.id !== temp.id && p.id !== res.plan.id), res.plan]));
      setAdding(false);
    });
  }

  function tick(plan: Plan) {
    const done = !plan.done_at;
    start(async () => {
      setPlans((cur) =>
        cur.map((p) => (p.id === plan.id ? { ...p, done_at: done ? new Date().toISOString() : null } : p)),
      );
      const res = await togglePlanDone(plan.id, done);
      if ("error" in res) {
        setPlans((cur) => cur.map((p) => (p.id === plan.id ? plan : p)));
        setError(res.error);
      }
    });
  }

  function saveEdit(plan: Plan, form: FormData) {
    setError(null);
    const title = String(form.get("title") ?? "").trim();
    const date = String(form.get("date") ?? "").trim();
    const time = String(form.get("time") ?? "").trim();
    const place = String(form.get("place") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();
    if (!title) {
      setError("give the date a name");
      return;
    }
    start(async () => {
      const res = await updatePlan(plan.id, { title, date, time, place, note });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setPlans((cur) => sortPlans([...cur.filter((p) => p.id !== plan.id), res.plan]));
      setEditing(null);
      // Moving a date to another day shouldn't leave you staring at an empty one.
      if (res.plan.date !== selected) jumpTo(res.plan.date);
    });
  }

  function remove(plan: Plan) {
    start(async () => {
      setPlans((cur) => cur.filter((p) => p.id !== plan.id));
      const res = await deletePlan(plan.id);
      if ("error" in res) {
        setPlans((cur) => sortPlans([...cur, plan]));
        setError(res.error);
      }
    });
  }

  return (
    <section className="space-y-4">
      <div className="card p-4 sm:p-5" style={{ ["--card-shadow" as string]: "var(--sky)" }}>
        {/* ---- month header ---- */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="sticker h-9 w-9"
            aria-label="Previous month"
          >
            <Icon name="back" size={16} strokeWidth={2.2} />
          </button>

          <div className="text-center">
            <h2 className="font-semibold tracking-tight text-2xl leading-tight sm:text-3xl">
              {monthLabel(month)}
            </h2>
            <button
              type="button"
              onClick={() => jumpTo(today)}
              className="label mt-1 hover:text-ink"
            >
              jump to today
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="sticker h-9 w-9"
            aria-label="Next month"
          >
            <Icon name="back" size={16} strokeWidth={2.2} className="rotate-180" />
          </button>
        </div>

        {/* ---- weekday rail ---- */}
        <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="label text-center text-[0.58rem]">{d}</span>
          ))}
        </div>

        {/* ---- the month ---- */}
        <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
          {grid.map(({ date, inMonth }) => {
            const dayPlans = byDate.get(date) ?? [];
            const open = dayPlans.filter((p) => !p.done_at);
            const isToday = date === today;
            const isSelected = date === selected;
            const anniversary = isAnniversaryDay(date, startDate);
            const color = colorFor(date);
            const hasPlans = dayPlans.length > 0;

            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  setSelected(date);
                  setAdding(false);
                  setEditing(null);
                  if (!inMonth) {
                    const d = fromDateOnly(date);
                    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  }
                }}
                aria-label={`${formatLongDate(date)}${dayPlans.length ? `, ${dayPlans.length} planned` : ""}`}
                aria-pressed={isSelected}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 text-sm font-bold transition-transform hover:-translate-y-0.5 hover:rotate-[-2deg] ${
                  isSelected ? "border-ink" : hasPlans ? "border-ink" : "border-line"
                } ${inMonth ? "" : "opacity-35"}`}
                style={{
                  background: isSelected ? "var(--ink)" : hasPlans ? color : "var(--surface)",
                  color: isSelected ? "var(--bg)" : "var(--ink)",
                  boxShadow: isSelected || hasPlans ? `2px 2px 0 var(--ink)` : undefined,
                }}
              >
                {isToday && (
                  <span
                    className="absolute inset-0 rounded-xl border-2 border-accent"
                    aria-hidden
                  />
                )}
                <span className={dayPlans.length > 0 ? "leading-none" : "leading-none"}>
                  {fromDateOnly(date).getDate()}
                </span>

                {anniversary && (
                  <Icon
                    name="heartFilled"
                    size={9}
                    className="absolute right-1 top-1 text-accent"
                  />
                )}

                {open.length > 0 && (
                  <span className="mt-1 flex gap-0.5" aria-hidden>
                    {open.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: isSelected ? "var(--bg)" : "var(--ink)" }}
                      />
                    ))}
                  </span>
                )}
                {open.length === 0 && dayPlans.length > 0 && (
                  <Icon name="check" size={10} className="mt-0.5 opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- the selected day ---- */}
      <div className="card p-4 sm:p-5" style={{ ["--card-shadow" as string]: colorFor(selected) }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="label">{countdownLabel(selected, today)}</p>
            <h3 className="font-semibold tracking-tight mt-0.5 text-2xl leading-tight">{formatLongDate(selected)}</h3>
          </div>
          {!adding && (
            <button type="button" onClick={() => setAdding(true)} className="btn btn-primary shrink-0 px-3 py-2 text-sm">
              <Icon name="plus" size={15} strokeWidth={2.4} />
              plan it
            </button>
          )}
        </div>

        {adding && (
          <form action={submit} className="mt-4 space-y-2.5">
            <input
              name="title"
              autoFocus
              required
              maxLength={MAX_PLAN_TITLE}
              placeholder="what are we doing?"
              className="input py-2.5 text-sm"
              aria-label="What are we doing"
            />
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">Time</span>
                <input name="time" type="time" className="input py-2.5 text-sm" aria-label="Time" />
              </label>
              <label className="flex-1">
                <span className="sr-only">Place</span>
                <input name="place" placeholder="where?" maxLength={80} className="input py-2.5 text-sm" />
              </label>
            </div>
            <input name="note" placeholder="a little note (optional)" maxLength={240} className="input py-2.5 text-sm" />
            <div className="flex gap-2 pt-0.5">
              <button type="submit" disabled={pending} className="btn btn-primary flex-1 py-2.5 text-sm">
                {pending ? "saving…" : "add to the calendar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setError(null);
                }}
                className="btn btn-ghost px-3 py-2.5 text-sm"
              >
                cancel
              </button>
            </div>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-accent" role="alert">{error}</p>}

        <div className="mt-4 space-y-2.5">
          {selectedPlans.length === 0 && !adding ? (
            <div className="dashed px-4 py-7 text-center">
              <p className="font-hand text-2xl text-muted">nothing planned yet</p>
              <p className="label mt-1">tap “plan it” and make something up</p>
            </div>
          ) : (
            selectedPlans.map((plan) => {
              const time = formatTime(plan.at_time);
              const done = Boolean(plan.done_at);

              if (editing === plan.id) {
                return (
                  <form
                    key={plan.id}
                    action={(form) => saveEdit(plan, form)}
                    className="space-y-2.5 rounded-2xl border-[1.5px] border-line p-3"
                    style={{ background: "var(--surface)", boxShadow: "3px 3px 0 var(--ink)" }}
                  >
                    <input
                      name="title"
                      autoFocus
                      required
                      defaultValue={plan.title}
                      maxLength={MAX_PLAN_TITLE}
                      className="input py-2.5 text-sm"
                      aria-label="What are we doing"
                    />
                    <div className="flex gap-2">
                      <input
                        name="date"
                        type="date"
                        defaultValue={plan.date}
                        className="input py-2.5 text-sm"
                        aria-label="Day"
                      />
                      <input
                        name="time"
                        type="time"
                        defaultValue={toTimeInput(plan.at_time)}
                        className="input py-2.5 text-sm"
                        aria-label="Time"
                      />
                    </div>
                    <input
                      name="place"
                      defaultValue={plan.place ?? ""}
                      placeholder="where?"
                      maxLength={80}
                      className="input py-2.5 text-sm"
                      aria-label="Place"
                    />
                    <input
                      name="note"
                      defaultValue={plan.note}
                      placeholder="a little note (optional)"
                      maxLength={240}
                      className="input py-2.5 text-sm"
                      aria-label="Note"
                    />
                    <div className="flex gap-2 pt-0.5">
                      <button type="submit" disabled={pending} className="btn btn-primary flex-1 py-2.5 text-sm">
                        {pending ? "saving…" : "save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(null);
                          setError(null);
                        }}
                        className="btn btn-ghost px-3 py-2.5 text-sm"
                      >
                        cancel
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={plan.id}
                  className="flex items-start gap-3 rounded-2xl border-[1.5px] border-line p-3 transition-transform hover:-translate-y-0.5"
                  style={{
                    background: done ? "var(--bg-soft)" : colorFor(plan.date),
                    boxShadow: `2px 2px 0 var(--line)`,
                    opacity: done ? 0.7 : 1,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => tick(plan)}
                    disabled={plan.id.startsWith("temp-")}
                    aria-pressed={done}
                    aria-label={done ? "Mark as not done" : "Mark as done"}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-surface text-accent transition-transform hover:scale-110"
                  >
                    {done && <Icon name="check" size={13} strokeWidth={2.6} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={`font-hand text-xl leading-tight text-ink ${done ? "line-through decoration-2" : ""}`}>
                      {plan.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/60">
                      {time && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="clock" size={11} /> {time}
                        </span>
                      )}
                      {plan.place && (
                        <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                          <Icon name="pin" size={11} /> {plan.place}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Avatar value={avatarOf(plan.created_by)} size={11} /> {nameOf(plan.created_by)}
                      </span>
                    </div>
                    {plan.note && <p className="mt-1.5 text-sm text-ink/70">{plan.note}</p>}
                  </div>

                  {!plan.id.startsWith("temp-") && (
                    <span className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(plan.id);
                          setAdding(false);
                          setError(null);
                        }}
                        className="tap rounded-full p-1 text-ink/40 hover:bg-ink/10 hover:text-ink"
                        aria-label="Change this plan"
                        title="change it"
                      >
                        <Icon name="edit" size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(plan)}
                        className="tap rounded-full p-1 text-ink/40 hover:bg-ink/10 hover:text-ink"
                        aria-label="Remove this plan"
                        title="remove"
                      >
                        <Icon name="close" size={13} />
                      </button>
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ---- what's coming ---- */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="label mb-2.5">coming up</h3>
          <ul className="stagger-in space-y-2">
            {upcoming.map((plan) => {
              const time = formatTime(plan.at_time);
              return (
                <li key={plan.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(plan.date)}
                    className="card jelly flex w-full items-center gap-3 p-3 text-left"
                    style={{ ["--card-shadow" as string]: colorFor(plan.date) }}
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border-[1.5px] border-line leading-none"
                      style={{ background: colorFor(plan.date) }}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider">
                        {fromDateOnly(plan.date).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="font-semibold tracking-tight text-lg">{fromDateOnly(plan.date).getDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-hand block truncate text-xl leading-tight">{plan.title}</span>
                      <span className="label mt-0.5 block">
                        {countdownLabel(plan.date, today)}
                        {time ? ` · ${time}` : ""}
                        {plan.place ? ` · ${plan.place}` : ""}
                      </span>
                    </span>
                    <Icon name="back" size={16} className="shrink-0 rotate-180 text-muted" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
