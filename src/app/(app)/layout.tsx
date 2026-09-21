import { Nav } from "@/components/nav";
import { getCurrentProfile } from "@/lib/data";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Throws/redirects if not signed in or not on the allowlist.
  await getCurrentProfile();

  return (
    <>
      <div className="mx-auto w-full max-w-lg px-5 pb-32 sm:max-w-3xl">{children}</div>
      <Nav />
    </>
  );
}
