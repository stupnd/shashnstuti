import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { MomentForm } from "@/components/moment-form";
import { getCurrentProfile } from "@/lib/data";
import { fetchEntry } from "@/lib/entries";
import { DeleteEntryButton } from "./delete-button";

export const metadata: Metadata = { title: "edit moment" };

export default async function EditEntryPage({ params }: PageProps<"/entry/[id]/edit">) {
  const { id } = await params;
  const [me, entry] = await Promise.all([getCurrentProfile(), fetchEntry(id)]);
  if (!entry) notFound();
  if (entry.author !== me.id) redirect(`/entry/${id}`);

  return (
    <main className="animate-fade-up">
      <PageHeader back={`/entry/${id}`} title="edit this page" caption="fix a typo, add a photo" />
      <div className="mt-6 space-y-8">
        <MomentForm mode="edit" entry={entry} />
        <DeleteEntryButton id={id} />
      </div>
    </main>
  );
}
