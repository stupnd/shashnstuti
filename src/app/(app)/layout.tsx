import { LetterAlerts } from "@/components/letter-alerts";
import { Nav } from "@/components/nav";
import { Onboarding } from "@/components/onboarding";
import { SpotifyPlayer } from "@/components/spotify-player";
import { getCurrentProfile, getSettings } from "@/lib/data";
import { fetchUnopenedLetters } from "@/lib/letters";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Throws/redirects if not signed in or not on the allowlist.
  const [me, settings, unopened] = await Promise.all([
    getCurrentProfile(),
    getSettings(),
    fetchUnopenedLetters(),
  ]);

  return (
    <>
      <LetterAlerts letters={unopened.map((l) => ({ id: l.id, title: l.title }))} />
      <div className="relative z-10 mx-auto w-full max-w-lg px-5 pb-32 sm:max-w-3xl">{children}</div>
      <Nav
        unopenedLetters={unopened.length}
        avatar={me.avatar_emoji}
        avatarUrl={me.avatar_url}
        name={me.display_name}
      />
      <SpotifyPlayer url={settings.spotify_url} />
      <Onboarding name={me.display_name} />
    </>
  );
}
