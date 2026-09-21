import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, getProfiles } from "@/lib/data";
import { fetchLetter } from "@/lib/letters";
import { DeleteLetterButton } from "./delete-button";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "letter" };

export default async function LetterPage({ params }: PageProps<"/letters/[id]">) {
  const { id } = await params;
  const [me, profiles, letter] = await Promise.all([getCurrentProfile(), getProfiles(), fetchLetter(id)]);
  if (!letter) notFound();
  const author = profiles.find((p) => p.id === letter.author);
  const mine = letter.author === me.id;

  return (
    <main className="animate-fade-up">
      <div className="flex items-center justify-between pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
        <Link href="/letters" className="label inline-flex items-center gap-1 hover:text-ink"><Icon name="back" size={14} /> letters</Link>
        <span className="label">{new Date(letter.created_at).toLocaleDateString()}</span>
      </div>

      <article className="card mt-4 px-6 py-8">
        <h1 className="font-script text-xl leading-relaxed">{letter.title}</h1>
        <p className="font-hand mt-6 whitespace-pre-wrap text-2xl leading-snug">{letter.body}</p>
        <p className="font-hand mt-8 text-2xl text-muted">— {author?.display_name}</p>
      </article>

      <p className="label mt-6 text-center">
        {letter.opened_at
          ? `opened ${new Date(letter.opened_at).toLocaleString()}`
          : mine
            ? "not opened yet"
            : ""}
      </p>
      {mine && <DeleteLetterButton id={letter.id} />}
    </main>
  );
}
