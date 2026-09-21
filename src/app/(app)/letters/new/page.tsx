import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { getPartner } from "@/lib/data";
import { LetterForm } from "./letter-form";

export const metadata: Metadata = { title: "write a letter" };

export default async function NewLetterPage() {
  const partner = await getPartner();
  return (
    <main className="animate-fade-up">
      <PageHeader back="/letters" title="a letter" caption={partner ? `to ${partner.display_name}` : "to…"} />
      <div className="mt-6">
        <LetterForm />
      </div>
    </main>
  );
}
