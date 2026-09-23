import type { Metadata } from "next";
import { PushNotifToggle } from "@/components/push-notif-toggle";
import { ReplayOnboardingButton } from "@/components/onboarding";
import { ThemeToggle } from "@/components/theme";
import { Avatar, Page, PageHeader } from "@/components/ui";
import { getCurrentProfile, getSettings } from "@/lib/data";
import { ProfileForm, SpotifyForm, StartDateForm } from "./forms";

export const metadata: Metadata = { title: "settings" };

export default async function SettingsPage() {
  const [me, settings] = await Promise.all([getCurrentProfile(), getSettings()]);

  return (
    <Page>
    <main className="animate-fade-up">
      <PageHeader back="/" title="settings" caption="the boring but useful page" hl="var(--lilac)" />

      {/* Who you're signed in as — the app has two accounts behind one shared
          password, so it's worth stating rather than leaving you to guess. */}
      <div className="card mt-4 flex items-center gap-3 p-4" style={{ "--card-shadow": "var(--pink)" } as React.CSSProperties}>
        <span className="sticker h-12 w-12 shrink-0 overflow-hidden p-0">
          <Avatar value={me.avatar_emoji} url={me.avatar_url} size={48} />
        </span>
        <div className="min-w-0">
          <p className="label">signed in as</p>
          <p className="font-semibold tracking-tight text-xl leading-tight">{me.display_name}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <section className="card p-5" style={{ "--card-shadow": "var(--butter)" } as React.CSSProperties}>
          <p className="label mb-3">look &amp; feel</p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold tracking-tight text-xl leading-tight">day or night?</p>
              <p className="mt-1 text-sm text-muted">cozy cream paper or soft scrapbook midnight.</p>
            </div>
            <ThemeToggle label />
          </div>
        </section>

        <section className="card p-5" style={{ "--card-shadow": "var(--mint)" } as React.CSSProperties}>
          <p className="label mb-3">soundtrack</p>
          <p className="mb-3 font-semibold tracking-tight text-xl leading-tight">our playlist</p>
          <SpotifyForm spotifyUrl={settings.spotify_url} />
        </section>

        <section className="card p-5" style={{ "--card-shadow": "var(--sky)" } as React.CSSProperties}>
          <p className="label mb-3">alerts</p>
          <PushNotifToggle />
        </section>

        <section className="card p-5" style={{ "--card-shadow": "var(--lilac)" } as React.CSSProperties}>
          <p className="label mb-3">intro</p>
          <p className="mb-3 font-semibold tracking-tight text-xl leading-tight">need a refresher?</p>
          <p className="mb-4 text-sm text-muted">walk through the sections again — home, book, letters, play, and the rest.</p>
          <ReplayOnboardingButton />
        </section>

        <section className="card p-5" style={{ "--card-shadow": "var(--pink)" } as React.CSSProperties}>
          <p className="label mb-4">you</p>
          <ProfileForm profile={me} />
        </section>

        <section className="card p-5" style={{ "--card-shadow": "var(--peach)" } as React.CSSProperties}>
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
