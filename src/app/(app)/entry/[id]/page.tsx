import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, iconFor } from "@/components/icons";
import { EntryPhotos } from "@/components/entry-photos";
import { Reactions } from "@/components/reactions";
import { Avatar, Page } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data";
import { formatLongDate } from "@/lib/dates";
import { fetchEntry, fetchReactions } from "@/lib/entries";

export const metadata: Metadata = { title: "moment" };

export default async function EntryPage({ params }: PageProps<"/entry/[id]">) {
  const { id } = await params;
  const [me, entry, reactions] = await Promise.all([getCurrentProfile(), fetchEntry(id), fetchReactions(id)]);
  if (!entry) notFound();
  const mine = entry.author === me.id;

  return (
    <Page>
    <main className="animate-fade-up">
      <div className="flex items-center justify-between pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
        <Link href="/timeline" transitionTypes={["nav-back"]} className="label inline-flex items-center gap-1 hover:text-ink"><Icon name="back" size={14} /> our book</Link>
        {mine && (
          <Link href={`/entry/${entry.id}/edit`} transitionTypes={["nav-forward"]} className="label inline-flex items-center gap-1 hover:text-ink">edit <Icon name="edit" size={14} /></Link>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border-[3px] border-ink shadow-[5px_5px_0_var(--peach)]">
        <EntryPhotos photos={entry.photos} alt={entry.title ?? entry.note ?? "photo"} canEdit={mine} />
      </div>

      <article className="mt-6 space-y-6">
        <header>
          <p className="label">
            {formatLongDate(entry.date)}
            {entry.place && <> · {entry.place}</>}
          </p>
          {entry.title && <h1 className="font-marker mt-2 text-3xl leading-tight">{entry.title}</h1>}
          {entry.is_milestone && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent"><Icon name="sparkle" size={14} /> milestone</p>
          )}
        </header>

        <div className="card p-5" style={{ "--card-shadow": "var(--butter)" } as React.CSSProperties}>
          {entry.note ? (
            <p className="whitespace-pre-wrap font-hand text-2xl leading-snug">{entry.note}</p>
          ) : mine ? (
            <Link href={`/entry/${entry.id}/edit`} className="font-hand text-2xl text-muted">add a note…</Link>
          ) : (
            <p className="font-hand text-2xl text-muted">no note yet</p>
          )}
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <Avatar value={entry.author_profile.avatar_emoji} size={14} /> {entry.author_profile.display_name}
            {entry.mood && <Icon name={iconFor(entry.mood, "happy")} size={16} className="ml-1" />}
          </p>
        </div>

        {entry.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {entry.tags.map((t) => <li key={t} className="chip pointer-events-none text-xs">#{t}</li>)}
          </ul>
        )}

        <Reactions entryId={entry.id} reactions={reactions} meId={me.id} />
      </article>
    </main>
    </Page>
  );
}
