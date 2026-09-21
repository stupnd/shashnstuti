"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { updateEntryDate } from "@/lib/actions/entries";
import { formatLongDate } from "@/lib/dates";

/** The entry's date as a tappable label; the author can change it in place. */
export function DateEditor({ id, date, canEdit, unsure }: { id: string; date: string; canEdit: boolean; unsure?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(date);
  const [pending, start] = useTransition();

  if (!canEdit) return <span>{formatLongDate(date)}</span>;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-butter ${unsure ? "bg-butter" : "bg-white"}`}
        title="Change the date"
      >
        <Icon name="edit" size={12} /> {unsure ? "date unknown — tap to set" : formatLongDate(date)}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="input w-auto py-1 text-sm" autoFocus />
      <button
        type="button"
        disabled={pending || !value}
        onClick={() =>
          start(async () => {
            await updateEntryDate(id, value);
            setEditing(false);
            router.refresh();
          })
        }
        className="btn btn-primary px-3 py-1.5 text-xs"
      >
        {pending ? "…" : "save"}
      </button>
      <button type="button" onClick={() => { setEditing(false); setValue(date); }} className="btn btn-ghost px-2 py-1.5 text-xs">cancel</button>
    </span>
  );
}
