import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getSettings } from "@/lib/data";
import { formatShortDate, relationshipYearStart, todayDateOnly } from "@/lib/dates";
import { yearsSoFar } from "@/lib/wrapped";

export const metadata: Metadata = { title: "wrapped" };

const COVERS = ["#e0464f", "#1f1c19", "#6a2cff", "#0fb5a8", "#ff6b1a", "#ffd400"];

export default async function WrappedIndex() {
  const settings = await getSettings();
  const years = await yearsSoFar(settings.start_date, todayDateOnly());

  return (
    <main className="animate-fade-up">
      <PageHeader title="wrapped" caption="one year of us, in numbers" />
      <ul className="mt-6 grid grid-cols-2 gap-3">
        {years.map(({ year, moments }, i) => (
          <li key={year}>
            <Link
              href={`/wrapped/${year}`}
              className="block aspect-[4/5] rounded-3xl p-5 text-white shadow-[var(--shadow-float)] transition-transform hover:-translate-y-1"
              style={{ background: COVERS[i % COVERS.length] }}
            >
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-80">year</p>
              <p className="text-6xl font-bold leading-none tracking-tight">{year}</p>
              <p className="mt-4 text-lg font-semibold leading-tight">{moments} moments</p>
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">
                {formatShortDate(relationshipYearStart(settings.start_date, year))} →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
