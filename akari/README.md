# Akari — Read the light

A clean, minimalist manga reader built with **Next.js 15** (App Router, JavaScript).
Dark, warm, paper-toned UI with a floating frosted-glass tab dock and a serif display face.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

## Data provider

Akari ships against **[CoorenLabs](https://github.com/CoorenLabs/CoorenLabs)** (default), a self-hosted
Bun + Elysia scraping API (AllManga provider — titles, chapters, pages). It runs next to Akari:

```bash
git clone https://github.com/CoorenLabs/CoorenLabs.git
cd CoorenLabs
bun install
cp .env.example .env   # set PORT (Akari expects 3101) and SERVER_ORIGIN
bun run start
```

It ships no API key — `.env` only holds `PORT` / `SERVER_ORIGIN` / CORS / Redis. Akari's image
optimizer needs the Cooren proxy in `next.config.mjs`; if you change `COOREN_URL`, update the
`remotePatterns` port too.

| Env var           | Default                          | Purpose                                       |
| ----------------- | -------------------------------- | --------------------------------------------- |
| `MANGA_PROVIDER`  | `cooren`                         | `cooren` (default), `mangadex`, or `mangahook`|
| `COOREN_URL`      | *(unset)*                        | Set to `http://localhost:3101` for the sidecar |
| `MANGAHOOK_URL`   | `http://localhost:3100`          | mangahook server, if you ever get one working |

**How it decides where to talk to AllManga:**
- `COOREN_URL` **unset** → everything is inlined in the app (used on Vercel, see below).
- `COOREN_URL` **set** → browsing + the headless-browser reader come from the sidecar (nice for local).

Deployed at `https://akari-iota-eight.vercel.app` (project `asd-b44e/akari`). Deliberately zero-config
on Vercel, no backend to run: trending/popular/search/detail are served by serverless functions
talking to the AllManga GraphQL API. Covers stream via proxies: most images flow from a Cloudflare
Worker (`akari-img.ayanbasit269.workers.dev`, source in `worker/`) — non-AniList bytes bypass Vercel
entirely; AniList manually blocks Cloudflare's egress (403 "manually blocked"), so AniList URLs stay on
Vercel's `/api/img`. Both proxies add the right Referer and stream bytes back (CDNs block direct browser traffic).

**Chapter pages:** AllManga gates its own page server behind Cloudflare (`AA_CRYPTO_MISSING`
for plain API callers — impossible on serverless). So on Vercel each chapter is matched to its
MangaDex twin title (strict normalized-substring match, all EN feed pages scanned for the number)
and served from MangaDex's at-home servers, proxied. Only if no MangaDex match exists does the
reader fall back to the "opens on AllManga" screen. Set `MANGA_PROVIDER=mangadex` to use
MangaDex exclusively (browsing included).

History: this app first ran on MangaDex (works) and before that the brief's `mangahook-api`
(dead upstream — see git log). Cooren is the default because it's the one the brief asked for.
Set `MANGA_PROVIDER=mangadex` to switch back; Cooren-routed ids (`cooren.…`) keep working.

The brief's MangaDex and mangahook providers were kept behind `MANGA_PROVIDER` so nothing is
locked in. All providers normalize into the same shape, so nothing else changes.

## Features

- **Suggestions** (home): auto-advancing spotlight carousel, trending rail, latest chapters, top-rated grid
- **Popular**: ranked list, sortable (Most followed / Top rated / Newest), paginated
- **Search**: debounced live search, recent + popular terms, result grid
- **Profile**: local-only library (bookmarks), reading stats, editable display name, clear-data control
- **Reader**: vertical page mode with progress bar, tap-to-toggle toolbar, keyboard shortcuts (← back, → jump to end)

All images stream from MangaDex's CDN; ratings/follows are live data. Explicit content is filtered (`safe` + `suggestive` only).

## Notes

- Bookmarks/stats/searches are stored in `localStorage` — no account, no backend of its own.
- MangaDex chapter pages are loaded from their at-home CDN on demand. Chapters marked "External" are hosted by publishers and open outside the app.
