import type { Metadata } from "next";
import Link from "next/link";
import { Envelope } from "@/components/envelope";
import { Icon } from "@/components/icons";
import { EmptyNote, PageHeader } from "@/components/ui";
import { getCurrentProfile, getProfiles } from "@/lib/data";
import { fetchLetters } from "@/lib/letters";

export const metadata: Metadata = { title: "letters" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="label mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default async function LettersPage() {
  const [me, profiles, { letters, locked }] = await Promise.all([getCurrentProfile(), getProfiles(), fetchLetters()]);
  const nameOf = (id: string) => profiles.find((x) => x.id === id)?.display_name ?? "?";

  const forMe = letters.filter((l) => l.recipient === me.id);
  const sealed = forMe.filter((l) => !l.opened_at);
  const opened = forMe.filter((l) => l.opened_at);
  const fromMe = letters.filter((l) => l.author === me.id);
  const empty = sealed.length + locked.length + opened.length + fromMe.length === 0;

  return (
    <main className="animate-fade-up">
      <PageHeader
        title="letters"
        caption="open when…"
        action={<Link href="/letters/new" className="btn btn-primary"><Icon name="edit" size={16} /> write one</Link>}
      />

      <div className="mt-6 space-y-10">
        {empty && <EmptyNote icon="envelope" title="no letters yet" body="write one for a rainy day" />}

        {sealed.length > 0 && (
          <Section title="for you — unopened">
            <div className="grid grid-cols-2 gap-4">
              {sealed.map((l) => <Envelope key={l.id} id={l.id} title={l.title} from={nameOf(l.author)} state="sealed" />)}
            </div>
          </Section>
        )}

        {locked.length > 0 && (
          <Section title="not yet">
            <div className="grid grid-cols-2 gap-4">
              {locked.map((l) => <Envelope key={l.id} id={l.id} title={l.title} from={nameOf(l.author)} state="locked" unlockAt={l.unlock_at} />)}
            </div>
          </Section>
        )}

        {opened.length > 0 && (
          <Section title="opened">
            <div className="grid grid-cols-2 gap-4">
              {opened.map((l) => <Envelope key={l.id} id={l.id} title={l.title} from={nameOf(l.author)} state="open" />)}
            </div>
          </Section>
        )}

        {fromMe.length > 0 && (
          <Section title="from you">
            <ul className="space-y-2">
              {fromMe.map((l) => (
                <li key={l.id}>
                  <Link href={`/letters/${l.id}`} className="card flex items-center justify-between p-4 hover:bg-bg-soft">
                    <span>
                      <span className="font-semibold">{l.title}</span>
                      <span className="label mt-0.5 block">
                        {l.opened_at ? "opened" : l.unlock_at && new Date(l.unlock_at) > new Date() ? `locked until ${new Date(l.unlock_at).toLocaleDateString()}` : "still sealed"}
                      </span>
                    </span>
                    <Icon name="back" size={16} className="rotate-180 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </main>
  );
}
