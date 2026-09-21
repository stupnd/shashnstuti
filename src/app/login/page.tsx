import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme";
import { Doodles, Squiggle } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "sign in" };

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-16">
      <Doodles />
      <div className="absolute right-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-20">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full max-w-sm text-center animate-fade-up">
        <p className="label">stuti &amp; shash</p>
        <h1 className="font-marker mt-2 text-5xl leading-tight sm:text-6xl">
          <span className="hl" style={{ "--hl": "var(--pink)" } as React.CSSProperties}>our scrapbook</span>
        </h1>
        <Squiggle className="mx-auto mt-2 w-48" color="var(--accent)" />
        <div className="card soft-glow mt-8 p-6" style={{ "--card-shadow": "var(--sky)" } as React.CSSProperties}>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
