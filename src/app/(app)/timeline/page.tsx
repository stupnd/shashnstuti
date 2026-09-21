import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Timeline } from "@/components/timeline";
import { Page, PageHeader } from "@/components/ui";
import { getCurrentProfile, getSettings } from "@/lib/data";
import { fetchEntriesPage } from "@/lib/entries";
import { fetchPinnedPhotoIds } from "@/lib/home-pins";

export const metadata: Metadata = { title: "our book" };

export default async function TimelinePage() {
  const [me, settings, page, pinnedIds] = await Promise.all([
    getCurrentProfile(),
    getSettings(),
    fetchEntriesPage({}),
    fetchPinnedPhotoIds(),
  ]);

  return (
    <Page>
      <main className="animate-fade-up">
        <PageHeader
          title="our book"
          caption="scroll to unfold · tap pin on a photo"
          hl="var(--mint)"
          action={
            <span className="flex gap-2">
              <Link href="/pins" transitionTypes={["nav-forward"]} aria-label="Pin to home" className="btn btn-soft h-11 w-11 rounded-full p-0">
                <Icon name="pushpin" size={20} />
              </Link>
              <Link href="/flip" transitionTypes={["nav-forward"]} aria-label="Flip through" className="btn btn-soft h-11 w-11 rounded-full p-0">
                <Icon name="heart" size={20} />
              </Link>
              <Link href="/ask" transitionTypes={["nav-forward"]} aria-label="Ask the book" className="btn btn-sky h-11 w-11 rounded-full p-0">
                <Icon name="eyes" size={20} />
              </Link>
              <Link href="/random" prefetch={false} aria-label="Random memory" className="btn btn-mint h-11 w-11 rounded-full p-0">
                <Icon name="dice" size={20} />
              </Link>
            </span>
          }
        />
        <Timeline
          initial={page.entries}
          initialCursor={page.next}
          startDate={settings.start_date}
          meId={me.id}
          pinnedPhotoIds={[...pinnedIds]}
        />
      </main>
    </Page>
  );
}
