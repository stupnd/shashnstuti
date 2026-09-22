import type { Metadata } from "next";
import Link from "next/link";
import { SetupNote } from "@/components/planner/setup-note";
import { Wishlist } from "@/components/planner/wishlist";
import { Icon } from "@/components/icons";
import { Page, PageHeader, Squiggle } from "@/components/ui";
import { getCurrentProfile, getPartner } from "@/lib/data";
import { todayDateOnly } from "@/lib/dates";
import { countdownLabel, formatTime, upcomingPlans } from "@/lib/planner";
import { fetchPlans, fetchWishes } from "@/lib/planner-data";

export const metadata: Metadata = { title: "ideas" };

export default async function PlannerPage() {
  const today = todayDateOnly();
  const [me, partner, { wishes, ready }, { plans }] = await Promise.all([
    getCurrentProfile(),
    getPartner(),
    fetchWishes(),
    fetchPlans(),
  ]);

  const open = wishes.filter((w) => !w.done_at).length;
  const soon = upcomingPlans(plans, today);
  const next = soon[0];

  return (
    <Page>
      <main className="animate-fade-up">
        <PageHeader
          title="things to do"
          caption={open === 0 ? "restaurants, places, anything" : `${open} on the list`}
          hl="var(--mint)"
        />

        <Squiggle className="mt-3 w-36 opacity-60" color="var(--accent)" />

        <div className="mt-6 space-y-6">
          {!ready && <SetupNote />}

          <Wishlist
            initial={wishes}
            me={{ id: me.id, display_name: me.display_name, avatar_emoji: me.avatar_emoji }}
            partner={
              partner
                ? { id: partner.id, display_name: partner.display_name, avatar_emoji: partner.avatar_emoji }
                : null
            }
          />

          {/* The calendar is the other half — same treatment, its own page. */}
          <Link
            href="/planner/calendar"
            transitionTypes={["nav-forward"]}
            className="card jelly flex items-center gap-3 p-4"
            style={{ ["--card-shadow" as string]: "var(--sky)" }}
          >
            <span className="sticker bob h-12 w-12 shrink-0 bg-sky text-accent">
              <Icon name="calendar" size={22} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="label">{next ? countdownLabel(next.date, today) : "when you pick a day"}</span>
              <span className="font-marker mt-0.5 block truncate text-2xl leading-tight">
                {next ? next.title : "the calendar"}
              </span>
              <span className="text-sm text-muted">
                {next
                  ? [
                      formatTime(next.at_time),
                      next.place,
                      soon.length > 1 ? `+${soon.length - 1} more planned` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "tap to see the month"
                  : "nothing planned yet — pick a day"}
              </span>
            </span>
            <Icon name="back" size={18} className="shrink-0 rotate-180 text-muted" />
          </Link>
        </div>
      </main>
    </Page>
  );
}
