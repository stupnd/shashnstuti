"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { Page, PageHeader } from "@/components/ui";
import { GAMES, type PlayMode } from "@/lib/play/types";

export function PlayHub({ partnerName }: { partnerName: string | null }) {
  const router = useRouter();

  const go = (gameId: string, mode: PlayMode) => {
    router.push(`/play/${gameId}?mode=${mode}`);
  };

  return (
    <Page>
      <main className="animate-fade-up">
        <PageHeader
          title="games"
          caption="just for fun — nothing scrapbooky"
          hl="var(--lilac)"
          back="/"
        />

        <p className="mt-3 text-sm text-muted">
          {partnerName
            ? `play on one phone, or open the same game on two phones and we’ll sync moves live.`
            : `pass-and-play works now. once both of you have signed in, two-phone games unlock.`}
        </p>

        <ul className="stagger-in mt-6 flex flex-col gap-4">
          {GAMES.map((g) => (
            <li key={g.id} className="card p-4" style={{ ["--card-shadow" as string]: g.color }}>
              <div className="flex items-start gap-3">
                <span className="sticker h-11 w-11 shrink-0" style={{ background: g.color }}>
                  <Icon name={g.icon} size={22} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-marker text-2xl leading-tight">{g.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{g.blurb}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn btn-soft text-sm" onClick={() => go(g.id, "pass")}>
                      same phone
                    </button>
                    <button
                      type="button"
                      className="btn btn-sky text-sm"
                      disabled={!partnerName}
                      onClick={() => go(g.id, "online")}
                      title={partnerName ? undefined : "partner needs to sign in once first"}
                    >
                      two phones
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-xs text-muted">
          tip: for two phones, both open the same game — seats claim automatically.
        </p>

        <div className="mt-4 text-center">
          <Link href="/" transitionTypes={["nav-back"]} className="label hover:text-ink">
            ← back home
          </Link>
        </div>
      </main>
    </Page>
  );
}
