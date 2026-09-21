import { LetterAlerts } from "@/components/letter-alerts";
import { Nav } from "@/components/nav";
import { Onboarding } from "@/components/onboarding";
import { Doodles } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data";
import { fetchUnopenedLetters } from "@/lib/letters";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Throws/redirects if not signed in or not on the allowlist.
  const me = await getCurrentProfile();
  const unopened = await fetchUnopenedLetters();

  return (
    <>
      <Doodles />
      <LetterAlerts letters={unopened.map((l) => ({ id: l.id, title: l.title }))} />
      <div className="relative z-10 mx-auto w-full max-w-lg px-5 pb-32 sm:max-w-3xl">{children}</div>
      <Nav unopenedLetters={unopened.length} />
      <Onboarding name={me.display_name} />
    </>
  );
}
