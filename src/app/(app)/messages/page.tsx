import type { Metadata } from "next";
import { ThoughtsBoard } from "@/components/thoughts-board";
import { Page, PageHeader } from "@/components/ui";
import { getCurrentProfile, getPartner } from "@/lib/data";
import { fetchThoughts } from "@/lib/thoughts-data";

export const metadata: Metadata = { title: "messages" };

export default async function MessagesPage() {
  const [me, partner, thoughts] = await Promise.all([
    getCurrentProfile(),
    getPartner(),
    fetchThoughts(),
  ]);

  return (
    <Page>
      <main className="animate-fade-up">
        <PageHeader
          title="messages"
          caption={partner ? `you & ${partner.display_name}` : "waiting for your person"}
          hl="var(--pink)"
        />

        <div className="mt-5">
          <ThoughtsBoard
            initial={thoughts}
            me={{ id: me.id, display_name: me.display_name, avatar_emoji: me.avatar_emoji }}
            partner={
              partner
                ? { id: partner.id, display_name: partner.display_name, avatar_emoji: partner.avatar_emoji }
                : null
            }
          />
        </div>
      </main>
    </Page>
  );
}
