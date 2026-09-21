"use client";

import { useTransition } from "react";
import { deleteLetter } from "@/lib/actions/letters";

export function DeleteLetterButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm("Delete this letter?") && start(() => deleteLetter(id))}
      className="btn btn-ghost mt-6 w-full text-muted hover:text-accent"
    >
      {pending ? "deleting…" : "delete this letter"}
    </button>
  );
}
