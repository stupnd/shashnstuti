"use client";

import { AvatarPicker } from "@/components/avatar-picker";
import { useActionState, useState } from "react";
import { AVATARS, Icon, iconFor } from "@/components/icons";
import type { Person } from "@/lib/database.types";
import { updateProfile, updateSpotifyUrl, updateStartDate, type SettingsState } from "./actions";

function Status({ state }: { state: SettingsState }) {
  if (state.error) return <p className="text-sm text-accent" role="alert">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-muted">saved</p>;
  return null;
}

export function ProfileForm({ profile }: { profile: Person }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  const [avatar, setAvatar] = useState(iconFor(profile.avatar_emoji));

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="label">display name</span>
        <input name="display_name" defaultValue={profile.display_name} className="input mt-2" maxLength={40} required />
      </label>

      <AvatarPicker currentUrl={profile.avatar_url} fallbackIcon={profile.avatar_emoji} />

      <div>
        <span className="label">your doodle</span>
        <p className="mb-1 mt-0.5 text-xs text-muted">used wherever you haven&apos;t got a photo</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button key={a} type="button" onClick={() => setAvatar(a)} aria-pressed={avatar === a} aria-label={a} className="chip chip-icon">
              <Icon name={a} size={22} />
            </button>
          ))}
        </div>
        <input type="hidden" name="avatar_emoji" value={avatar} />
      </div>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>{pending ? "saving…" : "save"}</button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function StartDateForm({ startDate }: { startDate: string }) {
  const [state, action, pending] = useActionState(updateStartDate, {});
  return (
    <form action={action} className="space-y-4">
      <input name="start_date" type="date" defaultValue={startDate} className="input" required />
      <div className="flex items-center gap-3">
        <button className="btn btn-soft" disabled={pending}>{pending ? "saving…" : "update"}</button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function SpotifyForm({ spotifyUrl }: { spotifyUrl: string | null }) {
  const [state, action, pending] = useActionState(updateSpotifyUrl, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">spotify link</span>
        <input
          name="spotify_url"
          type="url"
          defaultValue={spotifyUrl ?? ""}
          placeholder="https://open.spotify.com/playlist/…"
          className="input mt-2"
        />
      </label>
      <p className="text-sm text-muted">
        paste a playlist, album, or track — it shows up as the pink music button while you browse.
      </p>
      <div className="flex items-center gap-3">
        <button className="btn btn-mint" disabled={pending}>
          <Icon name="music" size={16} />
          {pending ? "saving…" : "save soundtrack"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
