# Our Scrapbook

A private scrapbook for two. Next.js 16 + Supabase, deployed on Vercel, installable as a PWA.

## Local setup

```
cp .env.local.example .env.local   # fill it in (see below)
npm install
npm run dev -- -p 3210             # port 3000 is taken on this Mac
```

## Supabase setup (one time)

1. **Create a project** at supabase.com.
2. **SQL Editor → run, in order:** every file in `supabase/migrations/` (01 schema+RLS, 02 storage, 03 seed, 04 wrapped, 05 captions).
3. **Auth → Providers → Email**: keep it enabled, turn **off** "Confirm email".
4. **Project Settings → API**: copy the URL, anon key and service_role key into `.env.local`.

Login is a shared password (`APP_PASSWORD`); each of you taps your name. Behind it a hidden
Supabase account per person (`src/lib/people.ts`) is signed in so Row Level Security knows who wrote what.

## Scripts

| command | what it does |
|---|---|
| `npm run import` | Bulk-import `import/` → entries (EXIF/filename/mtime dates, HEIC→WebP, same-day grouping, dedupe by hash, reverse-geocoded places). Safe to rerun. `-- --dry` to preview. |
| `npm run captions` | Claude looks at every photo and writes a 4–5 word caption (needs `ANTHROPIC_API_KEY`). `-- --redo` to rewrite all. |
| `npm run icons` | Regenerate PWA icons. |

## Deploying to Vercel

1. Push this folder to a GitHub repo (`import/` and `.env.local` are gitignored).
2. vercel.com → Add New Project → import the repo. Framework is auto-detected.
3. **Environment variables** (Production + Preview):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `APP_PASSWORD`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` (= your vercel URL).
4. Deploy. Then on your phones: open the URL in Safari → Share → **Add to Home Screen**.

## Project layout

```
supabase/migrations/       SQL schema, RLS policies, storage bucket, seed, wrapped, captions
scripts/                   import-photos, caption-photos, make-icons
src/proxy.ts               session refresh + redirect-to-login guard
src/lib/supabase/          browser / server / admin (service-role) clients
src/lib/database.types.ts  hand-written types matching the schema
src/lib/dates.ts           day-of-us, relationship year, anniversary maths
src/lib/entries.ts         entry queries + signed photo URLs + keyset pagination
src/lib/wrapped.ts         per-year stats
src/lib/actions/           server actions (entries, reactions, letters, wrapped)
src/lib/photos/            EXIF/filename dating, in-browser HEIC→WebP, upload
src/components/icons.tsx   the hand-drawn icon set (moods, avatars, reactions)
src/components/ui.tsx      PageHeader, Squiggle, Avatar, EmptyNote
src/app/(app)/             everything behind the login
```

## Decisions worth knowing

- **Photos are private**: bucket is not public; every image URL is a 1-hour signed URL made server-side.
- **Locked letters**: the recipient's session literally cannot `select` a locked letter's row (RLS), so the body is unreadable until the date, not just hidden.
- **Only the author can edit/delete** an entry (RLS). Imported entries belong to Stuti.
- **Timeline pagination** is keyset on `(date, created_at)`, 24 per page, infinite scroll.
- **Geocoding** is OpenStreetMap Nominatim (free, ~1 req/s) — place → pin on save; GPS from EXIF is the fallback.
