/**
 * Turn a Spotify share link into an embeddable player URL.
 * Accepts playlist / album / track / artist open.spotify.com links (and spotify: URIs).
 */
export function parseSpotifyEmbed(raw: string | null | undefined): {
  embedUrl: string;
  openUrl: string;
  kind: string;
} | null {
  if (!raw) return null;
  const input = raw.trim();
  if (!input) return null;

  let url: URL;
  try {
    if (input.startsWith("spotify:")) {
      const parts = input.split(":");
      const kind = parts[1];
      const id = parts[2];
      if (!kind || !id) return null;
      url = new URL(`https://open.spotify.com/${kind}/${id}`);
    } else {
      url = new URL(input);
    }
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host !== "open.spotify.com" && host !== "spotify.link") return null;

  // /playlist/playlist/ID or /playlist/intl-xx/playlist/ID or /playlist/ID
  const path = url.pathname.replace(/^\/embed/, "").replace(/^\/intl-[a-z]{2}/, "");
  const match = path.match(/^\/(playlist|album|track|artist|episode|show)\/([a-zA-Z0-9]+)/);
  if (!match) return null;

  const kind = match[1]!;
  const id = match[2]!;
  const openUrl = `https://open.spotify.com/${kind}/${id}`;
  const embedUrl = `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`;
  return { embedUrl, openUrl, kind };
}

export function isValidSpotifyUrl(raw: string): boolean {
  return parseSpotifyEmbed(raw) !== null;
}
