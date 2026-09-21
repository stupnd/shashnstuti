import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { MomentForm } from "@/components/moment-form";

export const metadata: Metadata = { title: "new moment" };

export default function NewMomentPage() {
  return (
    <main className="animate-fade-up">
      <PageHeader back="/timeline" title="a new page" caption="add a moment" />
      <div className="mt-6">
        <MomentForm mode="create" />
      </div>
    </main>
  );
}
