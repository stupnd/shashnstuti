import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
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
            <Link href="/pins" transitionTypes={["nav-forward"]} aria-label="Pin to home" className="btn btn-soft h-11 w-11 rounded-full p-0">
              <Icon name="pushpin" size={20} />
            </Link>
          }
        />

        {/* Other ways into the same photos. Map and wrapped used to be nav tabs
            with no other entry point anywhere in the app; this is their home. */}
        <div className="-mx-5 mt-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2">
            {[
              { href: "/map", label: "on a map", icon: "pin", color: "var(--lilac)" },
              { href: "/wrapped", label: "wrapped", icon: "sparkle", color: "var(--peach)" },
              { href: "/ask", label: "ask the book", icon: "eyes", color: "var(--sky)" },
              { href: "/random", label: "surprise me", icon: "dice", color: "var(--butter)" },
            ].map((b) => (
              <Link
                key={b.href}
                href={b.href}
                prefetch={b.href === "/random" ? false : undefined}
                transitionTypes={["nav-forward"]}
                className="chip shrink-0 whitespace-nowrap py-2 text-xs"
                style={{ background: b.color }}
              >
                <Icon name={b.icon as IconName} size={14} />
                {b.label}
              </Link>
            ))}
          </div>
        </div>

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
