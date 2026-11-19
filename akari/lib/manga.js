// Shared data layer.
// Default provider is "cooren" — the AllManga provider from CoorenLabs.
// If COOREN_URL is set, we talk to a running CoorenLabs sidecar (local dev,
// full headless-browser reader). If not (e.g. Vercel), the same provider is
// inlined from lib/allmanga.js — browsing works anywhere, and chapters open
// the AllManga reader externally because the sidecar the reader needs can't run there.
// mangadex / mangahook remain behind MANGA_PROVIDER as fallbacks.

import { proxyUrl } from "./proxy";
import { inlinePopular, inlineLatest, inlineSearch, inlineDetail, READER_URL } from "./allmanga";
import { mangapillChapter } from "./mangapill";

const MD = "https://api.mangadex.org";
const HOOK = process.env.MANGAHOOK_URL || "http://localhost:3100";
const COOREN = (process.env.COOREN_URL || "").replace(/\/$/, "");
const PROVIDER = process.env.MANGA_PROVIDER || "cooren";
const INLINE = PROVIDER === "cooren" && !COOREN;

const RATINGS = "contentRating[]=safe&contentRating[]=suggestive";

async function md(path, revalidate = 300) {
  const res = await fetch(`${MD}${path}`, {
    headers: { "User-Agent": "Akari/1.0 (manga reader)" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`MangaDex ${res.status} for ${path}`);
  return res.json();
}

async function hook(path, revalidate = 300) {
  const res = await fetch(`${HOOK}${path}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`mangahook ${res.status} for ${path}`);
  return res.json();
}

async function cooren(path) {
  const res = await fetch(`${COOREN}${path}`, { next: { revalidate: 120 } });
  const body = await res.json().catch(() => null);
  if (!res.ok || (body && body.success === false)) {
    throw new Error(`cooren ${res.status} for ${path}`);
  }
  return body?.data ?? body;
}

function pickTitle(t) {
  if (!t) return "Untitled";
  return t.en || t["ja-ro"] || Object.values(t)[0] || "Untitled";
}

function pickText(map, limit = 600) {
  if (!map) return "";
  const text = map.en || Object.values(map)[0] || "";
  return text.length > limit ? text.slice(0, limit).trim() + "…" : text;
}

function coverOf(m) {
  const rel = (m.relationships || []).find((r) => r.type === "cover_art");
  const file = rel?.attributes?.fileName;
  return file ? proxyUrl(`https://uploads.mangadex.org/covers/${m.id}/${file}.512.jpg`) : null;
}

function coverSmallOf(m) {
  const rel = (m.relationships || []).find((r) => r.type === "cover_art");
  const file = rel?.attributes?.fileName;
  return file ? proxyUrl(`https://uploads.mangadex.org/covers/${m.id}/${file}.256.jpg`) : null;
}

export function normalizeMangadex(m) {
  const a = m.attributes || {};
  return {
    id: m.id,
    title: pickTitle(a.title),
    cover: coverOf(m),
    coverSmall: coverSmallOf(m),
    description: pickText(a.description),
    status: a.status || "unknown",
    year: a.year ?? null,
    rating: a.rating?.bayesian != null ? Number(a.rating.bayesian.toFixed(2)) : null,
    follows: a.followedCount ?? null,
    chapter: a.lastChapter ? `Ch. ${a.lastChapter}` : null,
    tags: (a.tags || []).slice(0, 4).map((t) => t.attributes?.name?.en).filter(Boolean),
    contentRating: a.contentRating ?? "safe",
  };
}

function normalizeHook(m) {
  return {
    id: m.id,
    title: m.title || "Untitled",
    cover: proxyUrl(m.image),
    coverSmall: proxyUrl(m.image),
    description: m.description || "",
    status: "unknown",
    year: null,
    rating: null,
    follows: null,
    chapter: m.chapter || null,
    tags: [],
    contentRating: "safe",
    views: m.view || null,
  };
}

const stripMd = (s) =>
  !s ? "" : String(s)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .slice(0, 700)
    .trim();

function normalizeAllmanga(m) {
  const score = m.score ?? null;
  const chs = m.availableChapters?.sub;
  return {
    id: `cooren.${m.id}`,
    title: m.englishTitle || m.title || m.nativeTitle || "Untitled",
    cover: proxyUrl(m.cover),
    coverSmall: proxyUrl(m.coverSmall || m.cover),
    description: stripMd(m.description),
    status: (m.status || "unknown").toLowerCase(),
    year: m.airedStart ? new Date(m.airedStart).getUTCFullYear() : null,
    rating: score != null ? Number((score / 2).toFixed(2)) : null,
    follows: null,
    chapter: chs != null ? `Ch. ${chs}` : m.totalChapters ? `${m.totalChapters} ch` : null,
    tags: (m.genres || [])
      .map((g) => (typeof g === "string" ? g : g?.genre || g?.name || ""))
      .filter(Boolean)
      .slice(0, 4),
    contentRating: "safe",
  };
}

const pageCount = (total, got) => Math.min(Math.max(Math.ceil((total || got || 1) / (got || 1)), 1), 40);

async function coorenList(path) {
  const d = await cooren(path);
  const results = d?.results || [];
  return { list: results.map(normalizeAllmanga), totalPages: pageCount(d?.total, results.length) };
}

// ── Lists ────────────────────────────────────────────────────────────────────

export async function getSuggestions() {
  if (PROVIDER === "mangahook") {
    const d = await hook("/api/mangaList?type=latest&page=1");
    const list = (d.mangaList || []).map(normalizeHook);
    return { trending: list, latest: list.slice(0, 10), picks: list };
  }
  if (PROVIDER === "cooren") {
    if (INLINE) {
      const [weekly, latest, alltime] = await Promise.all([
        inlinePopular(1, "weekly"),
        inlineLatest(1),
        inlinePopular(1, "all"),
      ]);
      return {
        trending: weekly.list.map(normalizeAllmanga),
        latest: latest.list.slice(0, 10).map(normalizeAllmanga),
        picks: alltime.list.map(normalizeAllmanga),
      };
    }
    const [weekly, latest, alltime] = await Promise.all([
      coorenList("/manga/allmanga/popular?period=weekly"),
      coorenList("/manga/allmanga/latest?page=1"),
      coorenList("/manga/allmanga/popular?period=all"),
    ]);
    return { trending: weekly.list, latest: latest.list.slice(0, 10), picks: alltime.list };
  }
  const [trending, latest, topRated] = await Promise.all([
    md(`/manga?limit=12&${RATINGS}&includes[]=cover_art&order[followedCount]=desc`),
    md(`/manga?limit=10&${RATINGS}&includes[]=cover_art&order[latestUploadedChapter]=desc`),
    md(`/manga?limit=12&${RATINGS}&includes[]=cover_art&order[rating]=desc`),
  ]);
  return {
    trending: (trending.data || []).map(normalizeMangadex),
    latest: (latest.data || []).map(normalizeMangadex),
    picks: (topRated.data || []).map(normalizeMangadex),
  };
}

export async function getPopular(sort = "followed", page = 1) {
  const limit = 24;
  const offset = (Math.max(1, page) - 1) * limit;
  if (PROVIDER === "mangahook") {
    const type = sort === "top" ? "topread" : sort === "new" ? "latest" : "topview";
    const d = await hook(`/api/mangaList?type=${type}&page=${page}`);
    return { list: (d.mangaList || []).map(normalizeHook), totalPages: d.metaData?.totalPages ?? 1, page };
  }
  if (PROVIDER === "cooren") {
    if (INLINE) {
      const d = sort === "new"
        ? await inlineLatest(page)
        : sort === "top"
          ? await inlinePopular(page, "all")
          : await inlinePopular(page, "monthly");
      return { list: d.list.map(normalizeAllmanga), totalPages: d.totalPages, page };
    }
    const path = sort === "new"
      ? `/manga/allmanga/latest?page=${page}`
      : sort === "top"
        ? `/manga/allmanga/popular?period=all&page=${page}`
        : `/manga/allmanga/popular?period=monthly&page=${page}`;
    const d = await coorenList(path);
    return { list: d.list, totalPages: d.totalPages, page };
  }
  const order = { top: "rating", followed: "followedCount", new: "latestUploadedChapter" }[sort] || "followedCount";
  const d = await md(`/manga?limit=${limit}&offset=${offset}&${RATINGS}&includes[]=cover_art&order[${order}]=desc`);
  return {
    list: (d.data || []).map(normalizeMangadex),
    totalPages: Math.min(Math.ceil((d.total || limit) / limit), 40),
    page,
  };
}

export async function searchManga(query, page = 1) {
  if (!query?.trim()) return { list: [], totalPages: 1, page: 1 };
  const limit = 24;
  const offset = (Math.max(1, page) - 1) * limit;
  if (PROVIDER === "mangahook") {
    const d = await hook(`/api/search/${encodeURIComponent(query.trim())}&page=${page}`, 60);
    const list = (d.searchList || d.mangaList || d.data || []).map(normalizeHook);
    return { list, totalPages: 1, page };
  }
  if (PROVIDER === "cooren") {
    if (INLINE) {
      const d = await inlineSearch(query.trim(), page);
      return { list: d.list.map(normalizeAllmanga), totalPages: Math.min(d.totalPages, 20), page };
    }
    const d = await coorenList(`/manga/allmanga/search?q=${encodeURIComponent(query.trim())}&page=${page}`);
    return { list: d.list, totalPages: Math.min(d.totalPages, 20), page };
  }
  const d = await md(
    `/manga?title=${encodeURIComponent(query.trim())}&limit=${limit}&offset=${offset}&${RATINGS}&includes[]=cover_art&order[relevance]=desc`,
    60
  );
  return {
    list: (d.data || []).map(normalizeMangadex),
    totalPages: Math.min(Math.ceil((d.total || limit) / limit), 20),
    page,
  };
}

// ── Detail ───────────────────────────────────────────────────────────────────

const COOREN_PREFIX = "cooren.";

export async function getManga(id) {
  if (id.startsWith(COOREN_PREFIX)) {
    const rawId = id.slice(COOREN_PREFIX.length);
    if (INLINE) {
      const d = await inlineDetail(rawId);
      const manga = {
        id,
        title: d.englishTitle || d.title || d.nativeTitle || "Untitled",
        cover: proxyUrl(d.cover),
        coverSmall: proxyUrl(d.cover),
        description: d.description,
        status: (d.status || "unknown").toLowerCase(),
        year: d.airedStart ? new Date(d.airedStart).getUTCFullYear() : null,
        rating: null,
        follows: null,
        chapter: d.totalChapters ? `${d.totalChapters} ch` : null,
        tags: d.genres,
        contentRating: "safe",
      };
      const chapters = d.chapterList.map((c) => ({
        id: `${COOREN_PREFIX}${c.id.replace(/:/g, ".")}`,
        label: `Chapter ${c.number}`,
        group: "",
        date: null,
        external: false,
      }));
      return { manga, chapters };
    }
    const d = await cooren(`/manga/allmanga/detail?id=${encodeURIComponent(rawId)}`);
    const manga = { ...normalizeAllmanga(d), id };
    const chapters = (d.chapterList || [])
      .filter((c) => c.lang !== "raw")
      .map((c) => ({
        id: `${COOREN_PREFIX}${c.id.replace(/:/g, ".")}`,
        label: `Chapter ${c.number}${c.title && c.title !== `Chapter ${c.number}` ? ` — ${c.title}` : ""}`,
        group: "",
        date: null,
        external: false,
      }));
    return { manga, chapters };
  }
  if (PROVIDER === "mangahook") {
    const d = await hook(`/api/manga/${encodeURIComponent(id)}`);
    const m = d.manga || d;
    const chapters = (d.chapters || []).map((c, i) => ({
      id: c.id || c.chapterId || String(i),
      label: c.chapter || c.name || `Chapter ${i + 1}`,
      group: "",
      date: null,
      external: false,
    })).reverse();
    return { manga: normalizeHook({ ...m, id }), chapters };
  }
  const d = await md(`/manga/${encodeURIComponent(id)}?includes[]=cover_art`);
  const manga = normalizeMangadex(d.data);
  const feed = await md(
    `/manga/${encodeURIComponent(id)}/feed?translatedLanguage[]=en&limit=100&order[chapter]=desc&includes[]=scanlation_group`,
    120
  );
  const seen = new Set();
  const chapters = [];
  for (const c of feed.data || []) {
    const a = c.attributes || {};
    const group = (c.relationships || []).find((r) => r.type === "scanlation_group")?.attributes?.name || "";
    const key = a.chapter || c.id;
    if (seen.has(key)) continue; // one row per chapter number
    seen.add(key);
    chapters.push({
      id: c.id,
      label: a.chapter ? `Chapter ${a.chapter}${a.title ? ` — ${a.title}` : ""}` : a.title || "Oneshot",
      group,
      date: a.publishAt ? timeAgo(a.publishAt) : null,
      external: Boolean(a.externalUrl),
    });
  }
  return { manga, chapters };
}

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();



// AllManga ↔ MangaDex are two different catalogs with no shared ids.
// For the Vercel (no-sidecar) reader we serve the MangaDex twin of the
// AllManga title, which serves pages without captchas.
async function feedTotal(id) {
  const j = await md(`/manga/${id}/feed?translatedLanguage[]=en&limit=1`, 300);
  return j?.total ?? 0;
}

async function matchDex(d) {
  const candidates = [...new Set([d.englishTitle, d.nativeTitle, d.title].map(norm).filter(Boolean))];
  const related = new Map(); // id -> { id, score }
  for (const cand of candidates) {
    const j = await md(
      `/manga?title=${encodeURIComponent(cand)}&limit=5&contentRating[]=safe&contentRating[]=suggestive`,
      300
    );
    for (const hit of j.data || []) {
      const a = hit.attributes || {};
      const names = [
        a.title ? a.title.en || Object.values(a.title)[0] : "",
        ...(a.altTitles || []).map((t) => Object.values(t)[0]),
      ];
      let score = 0;
      for (const n of names) {
        const x = norm(n);
        if (!x) continue;
        if (x === cand) score = Math.max(score, 3);
        else if (x.includes(cand) || cand.includes(x)) score = Math.max(score, 1);
      }
      const prev = related.get(hit.id)?.score ?? 0;
      if (score > prev) related.set(hit.id, { id: hit.id, score });
    }
  }
  const arr = [...related.values()].filter((x) => x.score >= 1);
  if (arr.length <= 1) return arr[0]?.id ?? null;
  // Sequel/spinoff titles share names; when in doubt, read the one with more
  // English chapters — the reading experience beats clinical lineage.
  const withTotals = await Promise.all(
    arr.map(async (x) => ({ ...x, total: await feedTotal(x.id) }))
  );
  withTotals.sort((a, b) => b.total - a.total || b.score - a.score);
  return withTotals[0].id;
}

async function findDexChapter(dexId, num) {
  if (!Number.isFinite(num)) return null;
  const first = await md(`/manga/${dexId}/feed?translatedLanguage[]=en&limit=1&order[chapter]=asc`, 300);
  const total = Math.min(first?.total ?? 0, 2000);
  if (!total) return null;
  const guess = Math.min(
    Math.max(0, Math.floor((Math.ceil(num) - 1) / 100) * 100),
    Math.max(0, total - 1)
  );
  for (const off of [guess, guess - 100, guess + 100, 0, Math.max(0, total - 100)]) {
    if (off < 0) continue;
    const j = await md(`/manga/${dexId}/feed?translatedLanguage[]=en&limit=100&offset=${off}&order[chapter]=asc`, 300);
    const hit = (j.data || []).find((c) => parseFloat(c.attributes?.chapter) === num);
    if (hit) return hit.id;
  }
  return null;
}

async function dexChapterPages(dexChapterId) {
  const at = await md(`/at-home/server/${dexChapterId}`, 0);
  const hash = at.chapter?.hash;
  const files = at.chapter?.data || [];
  if (!hash || !files.length) throw new Error("No MangaDex page server for this chapter");
  return files.map((f) => proxyUrl(`${at.baseUrl}/data/${hash}/${f}`));
}

// ── Reader ───────────────────────────────────────────────────────────────────

export async function getChapterPages(chapterId) {
  if (chapterId.startsWith(COOREN_PREFIX)) {
    const rawId = chapterId.slice(COOREN_PREFIX.length);
    const parts = rawId.split('.'); const rawForApi = parts[0] + ':' + parts[1] + ':' + parts.slice(2).join('.'); const num = parts.slice(2).join('.') || null;
    if (INLINE) {
      const mangaId = parts[0] ? `${COOREN_PREFIX}${parts[0]}` : null;
      const numVal = parseFloat(num);
      try {
        const d = await inlineDetail(parts[0]); // cached
        // 1) MangaDex twin pages (out-of-license / scanlated series)
        let mp = null;
        try {
          const dexId = await matchDex(d);
          if (dexId) {
            const dexCh = await findDexChapter(dexId, numVal);
            if (dexCh) mp = (await dexChapterPages(dexCh).catch(() => null)) || null;
          }
        } catch (e) {
          console.error("[akari] mangadex twin failed:", e?.message || e);
        }
        if (mp?.length) return { pages: mp, external: false, mangaId, title: `Chapter ${num}` };
        // 2) Mangapill twin pages (licensed series MangaDex dropped)
        let pages = null;
        for (const cand of [...new Set([d.englishTitle, d.title, d.nativeTitle].filter(Boolean))]) {
          pages = (await mangapillChapter(cand, numVal).catch(() => null)) || null;
          if (pages?.length) break;
        }
        if (pages?.length) return { pages, external: false, mangaId, title: `Chapter ${num}` };
      } catch (e) {
        /* fall through — twin lookup failed, use external */
        console.error("[akari] twin match failed:", e?.message || e);
      }
      return {
        pages: [],
        external: true,
        externalUrl: `${READER_URL}/manga/${parts[0]}/chapter-${num}-${parts[1] || "sub"}`,
        mangaId,
        title: num ? `Chapter ${num}` : "Chapter",
      };
    }
    const d = await cooren(`/manga/allmanga/read?id=${encodeURIComponent(rawForApi)}`);
    const pages = (d?.pages || []).map((p) => p.img).filter(Boolean);
    return {
      pages,
      external: false,
      mangaId: parts[0] ? `${COOREN_PREFIX}${parts[0]}` : null,
      title: num ? `Chapter ${num}` : "Chapter",
    };
  }
  if (PROVIDER === "mangahook") {
    const d = await hook(`/api/manga/placeholder/${encodeURIComponent(chapterId)}`, 0);
    // mangahook stores panels only as chapter assets; not reachable without a live upstream.
    return { pages: d.chapterImageList || [], external: false, mangaId: null, title: "" };
  }
  const [meta, atHome] = await Promise.all([
    md(`/chapter/${encodeURIComponent(chapterId)}?includes[]=manga`, 0),
    md(`/at-home/server/${encodeURIComponent(chapterId)}`, 0),
  ]);
  const ch = meta.data;
  const mangaRel = (ch.relationships || []).find((r) => r.type === "manga");
  const a = ch.attributes || {};
  const hash = atHome.chapter?.hash;
  const files = atHome.chapter?.data || [];
  const pages = files.map((f) => proxyUrl(`${atHome.baseUrl}/data/${hash}/${f}`));
  return {
    pages,
    external: Boolean(a.externalUrl),
    mangaId: mangaRel?.id || null,
    title: a.chapter ? `Chapter ${a.chapter}${a.title ? ` — ${a.title}` : ""}` : "Oneshot",
  };
}

export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
