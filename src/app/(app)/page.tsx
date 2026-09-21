import Link from "next/link";
import { EntryTile } from "@/components/entry-tile";
import { Icon } from "@/components/icons";
import { Avatar, PageHeader, Squiggle } from "@/components/ui";
import { getCurrentProfile, getPartner, getSettings } from "@/lib/data";
import { dayOfUs, formatLongDate, formatShortDate, nextAnniversary, todayDateOnly } from "@/lib/dates";
import { fetchLatest, fetchOnThisDay } from "@/lib/entries";

export default async function HomePage() {
  const today = todayDateOnly();
  const [me, partner, settings, onThisDay, latest] = await Promise.all([
    getCurrentProfile(),
    getPartner(),
    getSettings(),
    fetchOnThisDay(today),
    fetchLatest(6),
  ]);

  const day = dayOfUs(settings.start_date);
  const anniversary = nextAnniversary(settings.start_date);
  const memory = onThisDay[0];

  return (
    <main className="relative animate-fade-up">
      <Squiggle className="pointer-events-none absolute -right-16 -top-2 w-64 opacity-70" flip />

      <PageHeader
        title={<>day {day.toLocaleString()} of us</>}
        caption={`since ${formatShortDate(settings.start_date)}`}
        action={
          <Link href="/settings" aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-bg-soft hover:text-ink">
            <Icon name="gear" size={20} />
          </Link>
        }
      />

      <div className="mt-6 flex items-center gap-2 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5"><Avatar value={me.avatar_emoji} /> {me.display_name}</span>
        <Icon name="heart" size={12} className="text-accent" />
        {partner ? (
          <span className="inline-flex items-center gap-1.5"><Avatar value={partner.avatar_emoji} /> {partner.display_name}</span>
        ) : (
          <span>waiting for shash to log in…</span>
        )}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <section className="card p-5">
          <p className="label">next anniversary</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {anniversary.daysUntil === 0 ? `${anniversary.years} years today` : `${anniversary.daysUntil} days`}
          </p>
          <p className="mt-1 text-sm text-muted">
            {anniversary.daysUntil === 0 ? "happy anniversary" : `until ${anniversary.years} years · ${formatLongDate(anniversary.date)}`}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/random" prefetch={false} className="card flex flex-col items-start justify-between p-5 hover:bg-bg-soft">
            <Icon name="dice" size={24} />
            <span className="mt-4 text-sm font-semibold">random<br />memory</span>
          </Link>
          <Link href="/new" className="card flex flex-col items-start justify-between bg-accent-soft p-5 text-accent-deep hover:bg-accent-soft/70">
            <Icon name="camera" size={24} />
            <span className="mt-4 text-sm font-semibold">add a<br />moment</span>
          </Link>
        </div>
      </div>

      {memory && (
        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-script text-lg">on this day</h2>
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
          <h2 className="font-script text-lg">latest pages</h2>
          <Link href="/timeline" className="label hover:text-ink">open the book →</Link>
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
  );
}
