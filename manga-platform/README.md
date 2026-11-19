# OMEGA — Manga, Manhwa & More

Premium glassmorphism manga platform, aggregating multiple backends behind one UI. Live: https://manga-platform-eight.vercel.app

## Backends (merged catalog)

| Source | Deployment | Content | Reading |
| --- | --- | --- | --- |
| **Cooren API** (github.com/CoorenLabs/CoorenLabs) | https://cooren-nine.vercel.app — own Vercel deploy, same architecture as akari-iota-eight.vercel.app (Vercel + Bun + Elysia + Cooren) | MangaPill catalog (One Piece, Frieren, etc.) incl. manga/manhwa/manhua/novels | **In-app reader** (page images served through Cooren's image proxy) |
| **OmegaAPI** (OmegaScans, via `omegapi-cf`) | Cloudflare Worker port | Adult/manhwa-heavy catalog | **In-app reader** |
| Akari v2 | api.akarimanga.dpdns.org (currently challenge/502-blocked) | General catalog | Wired, fails soft until the origin recovers |

Every card is tagged with its source (`OmegaScans` / `Cooren` / `Akari`). Dedup by normalized title; reader-capable sources win. Omega ratings are normalized ×2 to the common 0–10 scale; Cooren has no ratings/view counts (shows `—`/`0`).

**SFW front page by default.** Small amber **18+** button in the navbar (top-right): click → toast → full catalog unlocks incl. OmegaScans' adult content. Persisted in localStorage (`omega.ageAck`); click again to return to SFW.

## Pages

Home (hero, trending, latest, continue-reading, random) · Explore (search + sort + genre/type/status filters + pagination) · Latest · Random · Details (source-aware) · Full reader (vertical/single/double, RTL/LTR, fullscreen, keyboard nav, position persistence) · Library (bookmarks / favorites / history) · dual theme · 18+ toggle.

## Tech

React 19 · TypeScript · Vite · Tailwind · Framer Motion. Merged catalog + SFW denylist + reader persistence in `src/services/aggregate.ts`.

## Env

| Var | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `https://omegapi-cf.ayanbasit269.workers.dev/api/v1` | OmegaAPI base |
| `VITE_COREN_BASE_URL` | `https://cooren-nine.vercel.app/manga/mangapill` | Cooren (MangaPill) base |
| `VITE_AKARI_BASE_URL` | `https://api.akarimanga.dpdns.org/v2` | Akari v2 base (currently unreachable) |
| `VITE_USE_MOCKS` | `false` | `true` = offline demo dataset (invented data, labeled DEMO DATA) |

## Cooren notes

MangaPill has **no list endpoint** — the catalog browser searches with a broad query (`q=a`); search is real and full-text. No ratings, no view counts, no timestamps are reported by MangaPill (shown as `—` / `0` — never fabricated). Chapter list inside a title comes from `/detail/:id` (chapters newest-first); `/read/:chapterId` returns page image URLs; `prevChapterId`/`nextChapterId` drive reader navigation.

## Legal

Cooren scrapes official public sources; OmegaAPI wraps OmegaScans' API. This project hosts no content. Covers/metadata belong to their owners. The demo dataset is entirely invented.
