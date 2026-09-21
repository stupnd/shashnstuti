import Link from "next/link";
import { Confetti } from "@/components/confetti";
import { EntryTile } from "@/components/entry-tile";
import { Icon, type IconName } from "@/components/icons";
import { ThemeToggle } from "@/components/theme";
import { Avatar, Page, PageHeader } from "@/components/ui";
import { getCurrentProfile, getPartner, getSettings } from "@/lib/data";
import { dayOfUs, formatLongDate, formatShortDate, nextAnniversary, todayDateOnly } from "@/lib/dates";
import { fetchLatest, fetchOnThisDay } from "@/lib/entries";
import { fetchUnopenedLetters } from "@/lib/letters";

function ActionCard({ href, icon, color, children }: { href: string; icon: IconName; color: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      transitionTypes={["nav-forward"]}
      prefetch={href === "/random" ? false : undefined}
      className="card jelly flex flex-col items-start justify-between p-4 transition-transform hover:-translate-y-1 hover:-rotate-1"
      style={{ "--card-shadow": color } as React.CSSProperties}
    >
      <span className="sticker h-10 w-10" style={{ background: color }}><Icon name={icon} size={20} strokeWidth={2} /></span>
      <span className="mt-5 text-sm font-semibold leading-tight">{children}</span>
    </Link>
  );
}

export default async function HomePage() {
  const today = todayDateOnly();
  const [me, partner, settings, onThisDay, latest, unopened] = await Promise.all([
    getCurrentProfile(),
    getPartner(),
    getSettings(),
    fetchOnThisDay(today),
    fetchLatest(6),
    fetchUnopenedLetters(),
  ]);

  const day = dayOfUs(settings.start_date);
  const anniversary = nextAnniversary(settings.start_date);
  const isAnniversary = anniversary.daysUntil === 0;
  const memory = onThisDay[0];
  const topLetter = unopened[0];

  return (
    <Page>
      <main className="animate-fade-up">
        {isAnniversary && <Confetti />}

        <PageHeader
          title={<>day {day.toLocaleString()} of us</>}
          caption={`since ${formatShortDate(settings.start_date)}`}
          hl="var(--pink)"
          action={
            <span className="flex items-center gap-1">
              <ThemeToggle />
              <Link href="/settings" transitionTypes={["nav-forward"]} aria-label="Settings" className="btn btn-ghost h-11 w-11 rounded-full p-0">
                <Icon name="gear" size={22} />
              </Link>
            </span>
          }
        />

        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-muted">
          <span className="shimmy inline-flex items-center gap-1.5 rounded-full bg-pink px-2.5 py-1 text-ink"><Avatar value={me.avatar_emoji} size={15} /> {me.display_name}</span>
          <Icon name="heartFilled" size={14} className="heartbeat text-accent" />
          {partner ? (
            <span className="shimmy inline-flex items-center gap-1.5 rounded-full bg-sky px-2.5 py-1 text-ink" style={{ animationDelay: "0.6s" }}><Avatar value={partner.avatar_emoji} size={15} /> {partner.display_name}</span>
          ) : (
            <span>waiting for shash…</span>
          )}
        </div>

        {topLetter && (
          <Link
            href="/letters"
            transitionTypes={["nav-forward"]}
            className="card soft-glow mt-5 flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
            style={{ "--card-shadow": "var(--pink)" } as React.CSSProperties}
          >
            <span className="sticker bob h-12 w-12 shrink-0 bg-pink text-accent">
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

        <section className={`card mt-7 p-5 ${isAnniversary ? "soft-glow" : "shimmy"}`} style={{ "--card-shadow": isAnniversary ? "var(--accent)" : "var(--butter)", animationDuration: isAnniversary ? undefined : "6s" } as React.CSSProperties}>
          <p className="label">{isAnniversary ? "today!!!" : "next anniversary"}</p>
          <p className="font-marker mt-1 text-4xl leading-tight">
            {isAnniversary ? `happy ${anniversary.years} years` : `${anniversary.daysUntil} days`}
          </p>
          <p className="mt-1 text-sm text-muted">
            {isAnniversary ? "to us. go celebrate." : `until ${anniversary.years} years · ${formatLongDate(anniversary.date)}`}
          </p>
        </section>

        <div className="stagger-in mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ActionCard href="/watch" icon="sparkle" color="var(--sky)">watch<br />our story</ActionCard>
          <ActionCard href="/ask" icon="eyes" color="var(--lilac)">ask<br />the book</ActionCard>
          <ActionCard href="/flip" icon="heart" color="var(--mint)">flip<br />through us</ActionCard>
          <ActionCard href="/play" icon="dice" color="var(--butter)">play<br />a game</ActionCard>
        </div>

        {memory && (
          <section className="mt-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-marker text-2xl"><span className="hl" style={{ "--hl": "var(--sky)" } as React.CSSProperties}>on this day</span></h2>
              <span className="label">{formatShortDate(memory.date)}</span>
            </div>
            <div className="bento">
              <EntryTile entry={memory} meId={me.id} forceSpan="wide" reveal={false} />
            </div>
            {onThisDay.length > 1 && <p className="label mt-3">+{onThisDay.length - 1} more from this day</p>}
          </section>
        )}

        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-marker text-2xl"><span className="hl" style={{ "--hl": "var(--mint)" } as React.CSSProperties}>latest pages</span></h2>
            <Link href="/timeline" transitionTypes={["nav-forward"]} className="label hover:text-ink">open the book →</Link>
          </div>
          {latest.length === 0 ? (
            <p className="text-sm text-muted">nothing here yet — tap + to add your first moment.</p>
          ) : (
            <div className="bento">
              {latest.map((e) => <EntryTile key={e.id} entry={e} meId={me.id} reveal={false} />)}
            </div>
          )}
        </section>
      </main>
    </Page>
  );
}
