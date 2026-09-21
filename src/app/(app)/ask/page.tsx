import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data";
import { AskForm } from "./ask-form";

export const metadata: Metadata = { title: "ask the book" };

export default async function AskPage() {
  const me = await getCurrentProfile();
  return (
    <Page>
      <main className="animate-fade-up">
        <PageHeader back="/" title="ask the book" caption="it remembers everything" hl="var(--lilac)" />
        <div className="mt-6">
          <AskForm meId={me.id} />
        </div>
      </main>
    </Page>
  );
}
