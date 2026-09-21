"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { PEOPLE } from "@/lib/people";
import { signIn, type LoginState } from "./actions";

/** Type the code, tap your name. That's it. */
export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={formAction} className="space-y-4">
      <input
        name="password"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        placeholder="· · · ·"
        aria-label="Password"
        className="input text-center text-2xl tracking-[0.5em]"
        autoFocus
        required
      />

      {state.error && (
        <p className="text-sm font-medium text-accent" role="alert">{state.error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {PEOPLE.map((p, i) => (
          <button
            key={p.key}
            name="person"
            value={p.key}
            disabled={pending}
            className={`btn ${i === 0 ? "btn-primary" : "btn-soft"}`}
          >
            <Icon name="heart" size={16} /> I&apos;m {p.label}
          </button>
        ))}
      </div>
    </form>
  );
}
