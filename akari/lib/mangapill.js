// Mangapill-backed chapter reader for Akari's inline (serverless) mode.
// Plain HTML scrape with a browser-like UA — no browser pool needed, so
// chapter pages work where AllManga's reader (Cloudflare) or MangaDex's
// hollow EN catalog fail. Server-side only.

import { proxyUrl } from "./proxy";

const BASE = "https://mangapill.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

async function page(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": UA, Referer: `${BASE}/` },
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Mangapill ${res.status} for ${path}`);
  return res.text();
}

const strip = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// quick-search HTML fragment → [{ id, title, cover }]
async function search(query) {
  const t = await page(`/quick-search?q=${encodeURIComponent(query.trim())}`);
  const items = [];
  const re = /href="\/manga\/(\d+)\/([^"]*)"[\s\S]*?<div class="font-black">([^<]+)<\/div>/g;
  let m;
  while ((m = re.exec(t))) items.push({ id: m[1], slug: m[2], title: m[3].trim() });
  return items;
}

// detail page → [{ chapterId, number }]
async function chapters(id) {
  const t = await page(`/manga/${id}`);
  const out = [];
  const re = /href="\/chapters\/([A-Za-z0-9-]+)\/[^"]*"[^>]*>Chapter (\d+(?:\.\d+)?)<\/a>/g;
  let m;
  while ((m = re.exec(t))) out.push({ chapterId: m[1], number: parseFloat(m[2]) });
  return out;
}

// chapter page → [image urls]
async function pages(chapterId) {
  const t = await page(`/chapters/${chapterId}`);
  const urls = [];
  const re = /<img[^>]*class="[^"]*js-page[^"]*"[^>]*data-src="([^"]+)"/g;
  let m;
  while ((m = re.exec(t))) urls.push(m[1]);
  return urls;
}

// Match an AllManga title to a Mangapill series. Strict normalized equality
// wins; otherwise the first quick-search hit (relevance-ranked) is accepted.
export async function mangapillChapter(query, num) {
  const hits = await search(query);
  if (!hits.length) return null;
  const q = strip(query);
  const exact = hits.find((h) => strip(h.title) === q);
  const chosen = exact ?? hits[0];
  const chs = await chapters(chosen.id);
  const ch = chs.find((c) => c.number === num);
  if (!ch) return null;
  const imgs = await pages(ch.chapterId);
  return imgs.length ? imgs.map((u) => proxyUrl(u)) : null;
}
