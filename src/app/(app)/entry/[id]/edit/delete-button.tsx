"use client";

import { useTransition } from "react";
import { deleteEntry } from "@/lib/actions/entries";

export function DeleteEntryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this moment and its photos? This can't be undone.")) {
          start(() => deleteEntry(id));
        }
      }}
      className="btn btn-ghost w-full text-muted hover:text-accent"
    >
      {pending ? "deleting…" : "delete this moment"}
    </button>
  );
}
