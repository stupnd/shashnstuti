"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { setAvatarPath } from "@/app/(app)/settings/actions";
import { Icon, iconFor } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { processImage, uploadToStorage } from "@/lib/photos/browser";

/**
 * Upload a profile photo. The file is shrunk and converted to WebP in the
 * browser first (the same pipeline moments use), then uploaded straight to
 * storage — a 4MB camera photo never goes through a server action.
 */
export function AvatarPicker({
  currentUrl,
  fallbackIcon,
}: {
  currentUrl: string | null;
  fallbackIcon: string;
}) {
  const [url, setUrl] = useState(currentUrl);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  async function pick(file: File) {
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!session || !user) throw new Error("you got signed out — reload and try again");

      const image = await processImage(file);
      const path = `${user.id}/${crypto.randomUUID()}.${image.ext}`;

      await uploadToStorage({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        accessToken: session.access_token,
        bucket: "avatars",
        path,
        blob: image.blob,
        onProgress: setProgress,
      });

      const res = await setAvatarPath(path);
      if ("error" in res) throw new Error(res.error);
      setUrl(image.previewUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "that didn't work");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    start(async () => {
      const res = await setAvatarPath(null);
      if ("error" in res) setError(res.error);
      else setUrl(null);
    });
  }

  return (
    <div>
      <span className="label">your photo</span>
      <div className="mt-2 flex items-center gap-3">
        <span className="sticker h-16 w-16 overflow-hidden p-0">
          {url ? (
            <Image src={url} alt="" width={128} height={128} className="h-full w-full object-cover" unoptimized={url.startsWith("blob:")} />
          ) : (
            <Icon name={iconFor(fallbackIcon)} size={28} />
          )}
        </span>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || pending}
            onClick={() => input.current?.click()}
            className="btn btn-soft px-3 py-2 text-sm"
          >
            <Icon name="camera" size={15} />
            {busy ? `${Math.round(progress * 100)}%` : url ? "change" : "add a photo"}
          </button>
          {url && !busy && (
            <button type="button" disabled={pending} onClick={clear} className="btn btn-ghost px-3 py-2 text-sm">
              remove
            </button>
          )}
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
          e.target.value = "";
        }}
      />
      <p className="label mt-2">shown next to your name, and on the nav</p>
      {error && <p className="mt-2 text-sm text-accent" role="alert">{error}</p>}
    </div>
  );
}
