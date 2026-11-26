# Omega

## About

OMEGA is a premium glassmorphism manga platform that aggregates Cooren API and OmegaAPI (Cloudflare Worker) behind one unified catalog, with MangaDex wiring available. Every card is tagged with its source; the reader runs in-app with vertical/single/double page modes, RTL/LTR, fullscreen keyboard nav and position persistence. The product is SFW by default; a small amber 18+ toggle in the top-right unlocks the full OmegaScans-backed catalog behind a one-click acknowledgment. Library, bookmarks, history and continue-reading rows are all local-first.


Two manga readers, built and shipped side by side. Both remain independent apps — this repo is their shared home.

| Folder | What it is | Stack |
| --- | --- | --- |
| `manga-platform` | **OMEGA** — premium glassmorphism manga & manhwa reader aggregating Cooren API + OmegaAPI behind one UI; in-app reader, library/history, SFW-default with 18+ unlock | React 19 · TypeScript · Vite · Tailwind · Framer Motion |
| `akari` | **Akari** — minimalist manga & manhwa reader, AniList-curated, warm paper-toned UI, frosted-glass tab dock | Next.js 15 · TypeScript |
