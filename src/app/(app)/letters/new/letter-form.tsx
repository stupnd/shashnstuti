"use client";

import { useActionState, useState } from "react";
import { writeLetter, type LetterState } from "@/lib/actions/letters";

const IDEAS = ["open when you miss me", "open when you can't sleep", "open when you're stressed", "open on our anniversary", "open when you need a laugh"];

export function LetterForm() {
  const [state, action, pending] = useActionState<LetterState, FormData>(writeLetter, {});
  const [title, setTitle] = useState("");
  const [dated, setDated] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <div className="card space-y-5 p-5">
        <label className="block">
          <span className="label">title</span>
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} className="input mt-1.5" maxLength={80} required />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {IDEAS.map((i) => (
              <button key={i} type="button" onClick={() => setTitle(i)} className="chip text-xs">
                {i}
              </button>
            ))}
          </div>
        </label>

        <label className="block">
          <span className="label">the letter</span>
          <textarea name="body" rows={9} className="input mt-1.5 font-hand text-2xl leading-snug" placeholder="dear you…" required />
        </label>

        <label className="flex items-center gap-3">
          <input type="checkbox" checked={dated} onChange={(e) => setDated(e.target.checked)} className="h-5 w-5 accent-[#e0464f]" />
          <span className="text-sm">lock it until a date (an anniversary, a birthday…)</span>
        </label>
        {dated && (
          <input name="unlock_date" type="date" className="input" required />
        )}
      </div>

      <p className="text-xs text-muted">It stays sealed until they open it — and a locked letter stays hidden until the date.</p>
      {state.error && <p className="text-sm font-medium text-accent" role="alert">{state.error}</p>}
      <button className="btn btn-primary w-full py-4" disabled={pending}>
        {pending ? "sealing…" : "seal the envelope"}
      </button>
    </form>
  );
}
