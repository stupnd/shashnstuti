import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Timeline } from "@/components/timeline";
import { PageHeader } from "@/components/ui";
import { getCurrentProfile, getSettings } from "@/lib/data";
import { fetchEntriesPage } from "@/lib/entries";

export const metadata: Metadata = { title: "our book" };

export default async function TimelinePage() {
  const [me, settings, page] = await Promise.all([
    getCurrentProfile(),
    getSettings(),
    fetchEntriesPage({}),
  ]);

  return (
    <main className="animate-fade-up">
      <PageHeader
        title="our book"
        caption="scroll to unfold"
        action={
          <Link href="/random" prefetch={false} aria-label="Random memory" className="btn btn-soft h-10 w-10 rounded-full p-0">
            <Icon name="dice" size={20} />
          </Link>
        }
      />
      <Timeline initial={page.entries} initialCursor={page.next} startDate={settings.start_date} meId={me.id} />
    </main>
  );
}
