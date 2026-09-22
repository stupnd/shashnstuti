import type { Metadata } from "next";
import { PlannerCalendar } from "@/components/planner/calendar";
import { SetupNote } from "@/components/planner/setup-note";
import { Page, PageHeader } from "@/components/ui";
import { getCurrentProfile, getProfiles, getSettings } from "@/lib/data";
import { todayDateOnly } from "@/lib/dates";
import { fetchPlans } from "@/lib/planner-data";
import { upcomingPlans } from "@/lib/planner";

export const metadata: Metadata = { title: "calendar" };

export default async function CalendarPage() {
  const today = todayDateOnly();
  const [me, profiles, settings, { plans, ready }] = await Promise.all([
    getCurrentProfile(),
    getProfiles(),
    getSettings(),
    fetchPlans(),
  ]);

  const soon = upcomingPlans(plans, today).length;

  return (
    <Page>
      <main className="animate-fade-up">
        <PageHeader
          title="what's next"
          caption={soon === 0 ? "nothing planned yet" : `${soon} coming up`}
          back="/planner"
          hl="var(--sky)"
        />

        <div className="mt-5 space-y-6">
          {!ready && <SetupNote />}

          <PlannerCalendar
            initial={plans}
            today={today}
            startDate={settings.start_date}
            me={{ id: me.id, display_name: me.display_name, avatar_emoji: me.avatar_emoji }}
            people={profiles.map((p) => ({
              id: p.id,
              display_name: p.display_name,
              avatar_emoji: p.avatar_emoji,
            }))}
          />
        </div>
      </main>
    </Page>
  );
}
