import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/ui";
import { getCurrentProfile, getSettings } from "@/lib/data";
import { ProfileForm, StartDateForm } from "./forms";

export const metadata: Metadata = { title: "settings" };

export default async function SettingsPage() {
  const [me, settings] = await Promise.all([getCurrentProfile(), getSettings()]);

  return (
    <Page>
    <main className="animate-fade-up">
      <PageHeader back="/" title="settings" caption="the boring but useful page" hl="var(--lilac)" />

      <div className="mt-6 space-y-4">
        <section className="card p-5" style={{ "--card-shadow": "var(--pink)" } as React.CSSProperties}>
          <p className="label mb-4">you</p>
          <ProfileForm profile={me} />
        </section>

        <section className="card p-5" style={{ "--card-shadow": "var(--sky)" } as React.CSSProperties}>
          <p className="label">our start date</p>
          <p className="mb-4 mt-1 text-sm text-muted">day 1 — the counter, chapters and wrapped all count from here.</p>
          <StartDateForm startDate={settings.start_date} />
        </section>

        <form action="/auth/signout" method="post" className="pt-2">
          <button className="btn btn-ghost w-full">sign out</button>
        </form>
      </div>
    </main>
    </Page>
  );
}
