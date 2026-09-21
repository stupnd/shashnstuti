"use client";

import { useState, useTransition } from "react";
import { addReaction, deleteReaction } from "@/lib/actions/reactions";
import type { ReactionWithAuthor } from "@/lib/entries";
import { HeartBurst } from "./hearts";
import { Icon, REACTIONS, iconFor } from "./icons";
import { Avatar } from "./ui";

export function Reactions({ entryId, reactions, meId }: { entryId: string; reactions: ReactionWithAuthor[]; meId: string }) {
  const [emoji, setEmoji] = useState<string>("heart");
  const [reply, setReply] = useState("");
  const [burst, setBurst] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    start(async () => {
      try {
        await addReaction(entryId, emoji, reply);
        setReply("");
        setBurst((b) => b + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "couldn't react");
      }
    });
  }

  return (
    <section className="space-y-3">
      <HeartBurst burst={burst} />
      <p className="label">replies</p>

      {reactions.map((r) => (
        <div key={r.id} className="card flex items-start gap-3 p-4">
          <span className="text-accent"><Icon name={iconFor(r.emoji)} size={26} /></span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs text-muted"><Avatar value={r.author_profile.avatar_emoji} size={13} /> {r.author_profile.display_name}</p>
            {r.reply && <p className="font-hand text-2xl leading-tight">{r.reply}</p>}
          </div>
          {r.author === meId && (
            <button type="button" aria-label="Delete reply" onClick={() => start(() => deleteReaction(r.id, entryId))} className="text-muted hover:text-accent">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      ))}

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {REACTIONS.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)} aria-pressed={emoji === e} aria-label={e} className="chip chip-icon h-10 w-10">
              <Icon name={e} size={20} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="say something back…"
            className="input py-2 font-hand text-xl"
            maxLength={280}
          />
          <button type="button" onClick={submit} disabled={pending} aria-label="Send" className="btn btn-primary h-11 w-11 shrink-0 rounded-full p-0">
            <Icon name={iconFor(emoji)} size={20} />
          </button>
        </div>
        {error && <p className="text-sm text-accent">{error}</p>}
      </div>
    </section>
  );
}
