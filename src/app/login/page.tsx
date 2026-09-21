import type { Metadata } from "next";
import { Squiggle } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "sign in" };

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-16">
      <Squiggle className="absolute -left-10 top-6 w-72 sm:w-96" />
      <Squiggle className="absolute -right-10 bottom-8 w-72 sm:w-96" flip />

      <div className="w-full max-w-sm text-center animate-fade-up">
        <h1 className="font-script text-4xl leading-relaxed sm:text-5xl">Our Scrapbook</h1>
        <p className="label mt-1">stuti &amp; shash</p>
        <div className="mt-10">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
