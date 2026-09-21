"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { EntryTile } from "@/components/entry-tile";
import { Icon } from "@/components/icons";
import { askBook, type AskResult } from "@/lib/actions/ask";

const IDEAS = [
  "that time we got burritos",
  "what were we doing a year ago today?",
  "our best trip",
  "every time it rained on us",
  "the first photo of us",
  "moments in Montréal",
];

export function AskForm({ meId }: { meId: string }) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [pending, start] = useTransition();

  function ask(question = q) {
    if (!question.trim()) return;
    setQ(question);
    start(async () => setResult(await askBook(question)));
  }

  return (
    <div className="space-y-6">
      <div className="card p-4" style={{ "--card-shadow": "var(--lilac)" } as CSSProperties}>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="ask anything about us…"
            className="input font-hand text-2xl"
            maxLength={300}
            autoFocus
          />
          <button type="button" onClick={() => ask()} disabled={pending || !q.trim()} aria-label="Ask" className="btn btn-primary h-[52px] w-[52px] shrink-0 rounded-2xl p-0">
            <Icon name="eyes" size={22} strokeWidth={2.2} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {IDEAS.map((i) => (
            <button key={i} type="button" onClick={() => ask(i)} className="chip text-xs">{i}</button>
          ))}
        </div>
      </div>

      {pending && (
        <p className="font-marker text-center text-2xl text-muted animate-pulse">flipping through the pages…</p>
      )}

      {!pending && result && "error" in result && (
        <p className="text-center text-sm font-semibold text-accent">{result.error}</p>
      )}

      {!pending && result && "answer" in result && (
        <div className="space-y-5">
          <div className="card p-5" style={{ "--card-shadow": "var(--butter)" } as CSSProperties}>
            <p className="font-hand text-2xl leading-snug">{result.answer}</p>
          </div>
          {result.entries.length > 0 && (
            <div className="bento">
              {result.entries.map((e) => <EntryTile key={e.id} entry={e} meId={meId} reveal={false} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
