import Link from "next/link";
import { Confetti } from "@/components/confetti";
import { EntryTile } from "@/components/entry-tile";
import { HomePinsGrid } from "@/components/home-pins";
import { Icon, type IconName } from "@/components/icons";
import { ThemeToggle } from "@/components/theme";
import { ThoughtsBoard } from "@/components/thoughts-board";
import { Avatar, Page, PageHeader, Squiggle } from "@/components/ui";
import { getCurrentProfile, getPartner, getSettings } from "@/lib/data";
import { dayOfUs, formatLongDate, formatShortDate, nextAnniversary, todayDateOnly } from "@/lib/dates";
import { fetchLatest, fetchOnThisDay } from "@/lib/entries";
import { fetchHomePins } from "@/lib/home-pins";
import { fetchUnopenedLetters } from "@/lib/letters";
import { fetchThoughts } from "@/lib/thoughts-data";

function Shortcut({ href, icon, color, label }: { href: string; icon: IconName; color: string; label: string }) {
  return (
    <Link
      href={href}
      transitionTypes={["nav-forward"]}
      className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-ink bg-surface px-2 py-3 text-center shadow-[3px_3px_0_var(--chip)] transition-transform hover:-translate-y-1 hover:-rotate-2"
      style={{ ["--chip" as string]: color }}
    >
      <span className="sticker h-9 w-9" style={{ background: color }}>
        <Icon name={icon} size={18} strokeWidth={2} />
      </span>
      <span className="text-[11px] font-bold leading-tight">{label}</span>
    </Link>
  );
}

export default async function HomePage() {
  const today = todayDateOnly();
  const [me, partner, settings, onThisDay, latest, unopened, thoughts, pins] = await Promise.all([
    getCurrentProfile(),
    getPartner(),
    getSettings(),
    fetchOnThisDay(today),
    fetchLatest(10),
    fetchUnopenedLetters(),
    fetchThoughts(),
    fetchHomePins(),
  ]);

  const day = dayOfUs(settings.start_date);
  const anniversary = nextAnniversary(settings.start_date);
  const isAnniversary = anniversary.daysUntil === 0;
  const memory = onThisDay[0];
  const topLetter = unopened[0];
  const pinnedEntryIds = new Set(pins.map((p) => p.entryId));
  // Keep featured / pinned out of the fallback latest grid.
  const latestGrid = latest.filter((e) => e.id !== memory?.id && !pinnedEntryIds.has(e.id));
  const showLatestFallback = pins.length === 0;

  return (
    <Page>
      <main className="animate-fade-up">
        {isAnniversary && <Confetti />}

        <PageHeader
          title={<>day {day.toLocaleString()} of us</>}
          caption={`since ${formatShortDate(settings.start_date)}`}
          hl="var(--pink)"
          action={<ThemeToggle />}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href="/settings"
            transitionTypes={["nav-forward"]}
            className="shimmy inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-pink px-2.5 py-1 text-sm font-medium text-ink"
            aria-label="Settings"
          >
            <Avatar value={me.avatar_emoji} size={15} /> {me.display_name}
          </Link>
          <Icon name="heartFilled" size={16} className="heartbeat text-accent" />
          {partner ? (
            <span className="shimmy inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-sky px-2.5 py-1 text-sm font-medium text-ink" style={{ animationDelay: "0.6s" }}>
              <Avatar value={partner.avatar_emoji} size={15} /> {partner.display_name}
            </span>
          ) : (
            <span className="text-sm text-muted">waiting for shash…</span>
          )}
        </div>

        <Squiggle className="mt-4 w-40 opacity-60" color="var(--accent)" />

        <section className="mt-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-marker text-2xl">
              <span className="hl" style={{ ["--hl" as string]: "var(--peach)" }}>
                {pins.length > 0 ? "on the fridge" : "photos"}
              </span>
            </h2>
            <Link href="/pins" transitionTypes={["nav-forward"]} className="label inline-flex items-center gap-1 hover:text-ink">
              <Icon name="pushpin" size={12} />
              {pins.length > 0 ? "edit pins" : "pin favorites"} →
            </Link>
          </div>

          <HomePinsGrid initial={pins} />
        </section>

        {memory && (
          <section className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-marker text-2xl">
                <span className="hl" style={{ ["--hl" as string]: "var(--sky)" }}>on this day</span>
              </h2>
              <span className="label">{formatShortDate(memory.date)}</span>
            </div>
            <div className="bento">
              <EntryTile entry={memory} meId={me.id} forceSpan="big" reveal={false} />
            </div>
            {onThisDay.length > 1 && <p className="label mt-3">+{onThisDay.length - 1} more from this day</p>}
          </section>
        )}

        {showLatestFallback && latestGrid.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-marker text-2xl">
                <span className="hl" style={{ ["--hl" as string]: "var(--mint)" }}>latest pages</span>
              </h2>
              <Link href="/timeline" transitionTypes={["nav-forward"]} className="label hover:text-ink">
                open the book →
              </Link>
            </div>
            <div className="bento">
              {latestGrid.map((e) => (
                <EntryTile key={e.id} entry={e} meId={me.id} reveal={false} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 space-y-3">
          <p className="label">cards</p>

          {topLetter && (
            <Link
              href="/letters"
              transitionTypes={["nav-forward"]}
              className="card soft-glow flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
              style={{ ["--card-shadow" as string]: "var(--lilac)" }}
            >
              <span className="sticker bob h-12 w-12 shrink-0 bg-lilac text-accent">
                <Icon name="envelope" size={22} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="label">you&apos;ve got mail</span>
                <span className="font-marker mt-0.5 block truncate text-2xl leading-tight">{topLetter.title}</span>
                <span className="text-sm text-muted">
                  {unopened.length === 1 ? "a sealed letter is waiting — tap to open" : `${unopened.length} sealed letters are waiting`}
                </span>
              </span>
              <Icon name="back" size={18} className="rotate-180 shrink-0 text-muted" />
            </Link>
          )}

          <div
            className={`flex items-center justify-between gap-3 rounded-[1.4rem] border-2 border-ink px-4 py-3 ${isAnniversary ? "soft-glow bg-accent-soft" : "bg-butter"}`}
            style={{ boxShadow: `4px 4px 0 ${isAnniversary ? "var(--accent)" : "var(--peach)"}` }}
          >
            <div className="min-w-0">
              <p className="label">{isAnniversary ? "today!!!" : "next anniversary"}</p>
              <p className="font-marker text-2xl leading-tight sm:text-3xl">
                {isAnniversary ? `happy ${anniversary.years} years` : `${anniversary.daysUntil} days to go`}
              </p>
              {!isAnniversary && (
                <p className="truncate text-xs text-muted">{formatLongDate(anniversary.date)} · {anniversary.years} years</p>
              )}
            </div>
            <span className="sticker h-11 w-11 shrink-0 bg-surface text-accent">
              <Icon name={isAnniversary ? "party" : "sparkle"} size={20} />
            </span>
          </div>

          <div className="stagger-in grid grid-cols-4 gap-2.5 pt-1">
            <Shortcut href="/watch" icon="sparkle" color="var(--sky)" label="watch" />
            <Shortcut href="/flip" icon="heart" color="var(--mint)" label="flip" />
            <Shortcut href="/play" icon="dice" color="var(--butter)" label="play" />
            <Shortcut href="/ask" icon="eyes" color="var(--lilac)" label="ask" />
          </div>
        </section>

        <div className="mt-10">
          <ThoughtsBoard
            initial={thoughts}
            me={{ id: me.id, display_name: me.display_name, avatar_emoji: me.avatar_emoji }}
            partner={partner ? { id: partner.id, display_name: partner.display_name, avatar_emoji: partner.avatar_emoji } : null}
          />
        </div>
      </main>
    </Page>
  );
}
