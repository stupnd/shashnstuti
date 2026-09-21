"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { Scoreboard } from "@/components/play/scoreboard";
import { Page, PageHeader } from "@/components/ui";
import { GAMES, type PlayerInfo } from "@/lib/play/types";

export function PlayHub({
  me,
  partner,
}: {
  me: PlayerInfo;
  partner: PlayerInfo | null;
}) {
  const router = useRouter();

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
          {partner
            ? `open the same game on both phones — moves sync live.`
            : `once both of you have signed in, you can play across phones.`}
        </p>

        <Scoreboard me={me} partner={partner} />

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
                  <button
                    type="button"
                    className="btn btn-soft mt-3 text-sm"
                    disabled={!partner}
                    onClick={() => router.push(`/play/${g.id}`)}
                    title={partner ? undefined : "partner needs to sign in once first"}
                  >
                    play
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 text-center">
          <Link href="/" transitionTypes={["nav-back"]} className="label hover:text-ink">
            ← back home
          </Link>
        </div>
      </main>
    </Page>
  );
}
