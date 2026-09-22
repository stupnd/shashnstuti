import { Icon } from "@/components/icons";

/** Shown until supabase/migrations/…_planner.sql has been run. */
export function SetupNote() {
  return (
    <div className="card p-5" style={{ ["--card-shadow" as string]: "var(--butter)" }}>
      <div className="flex items-start gap-3">
        <span className="sticker h-11 w-11 shrink-0 bg-butter text-accent">
          <Icon name="calendar" size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="font-marker text-2xl leading-tight">one more step</h2>
          <p className="mt-1 text-sm text-muted">
            The planner tables aren&apos;t in Supabase yet. Open the SQL editor and run{" "}
            <code className="rounded bg-bg-soft px-1 py-0.5 text-xs">
              supabase/migrations/20260922000012_planner.sql
            </code>
            , then refresh.
          </p>
        </div>
      </div>
    </div>
  );
}
