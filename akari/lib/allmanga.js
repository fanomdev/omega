// Inline AllManga (CoorenLabs' provider, ported minus the headless browser).
// Used when COOREN_URL is NOT set (e.g. on Vercel, where a long-lived
// puppeteer sidecar can't run). Browsing works anywhere over plain HTTP.
// Chapter pages can't — mkissa.to is Cloudflare-walled — so getChapterPages
// returns an external link for the user's real browser instead.

import { createHash } from "node:crypto";

const API_URL = "https://api.allanime.day/api";
const BASE_URL = "https://allmanga.to";
const CDN = "https://wp.youtube-anime.com/aln.youtube-anime.com";
export const READER_URL = "https://mkissa.to";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";
const HEADERS = { "User-Agent": UA, Referer: `${BASE_URL}/`, Origin: BASE_URL };
const PERIODS = { daily: 1, weekly: 7, monthly: 30, all: 0 };

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

const CARD = "_id name englishName nativeName thumbnail score availableChapters";
const QUERIES = {
  popular: `query($type:VaildPopularTypeEnumType!,$size:Int!,$dateRange:Int,$page:Int,$allowAdult:Boolean,$allowUnknown:Boolean){queryPopular(type:$type,size:$size,dateRange:$dateRange,page:$page,allowAdult:$allowAdult,allowUnknown:$allowUnknown){total recommendations{anyCard{${CARD}}}}}`,
  search: `query($search:SearchInput,$limit:Int,$page:Int,$translationType:VaildTranslationTypeMangaEnumType,$countryOrigin:VaildCountryOriginEnumType){mangas(search:$search,limit:$limit,page:$page,translationType:$translationType,countryOrigin:$countryOrigin){pageInfo{total}edges{${CARD}}}}`,
  manga: `query($_id:String!){manga(_id:$_id){_id name englishName nativeName thumbnail description authors genres status availableChapters availableChaptersDetail airedStart airedEnd}}`,
};
const HASHES = Object.fromEntries(
  Object.entries(QUERIES).map(([n, q]) => [n, createHash("sha256").update(q).digest("hex")]),
);

async function gql(name, variables) {
  const query = QUERIES[name];
  const extensions = { persistedQuery: { version: 1, sha256Hash: HASHES[name] } };
  const params = new URLSearchParams({ variables: JSON.stringify(variables), extensions: JSON.stringify(extensions) });
  let body = await getJson(`${API_URL}?${params}`);
  if (body.errors?.some((e) => e.message === "PersistedQueryNotFound")) {
    body = await getJson(API_URL, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables, extensions }),
    });
  }
  const messages = body.errors?.map((e) => e.message).join("; ");
  if (messages) throw new Error(`AllManga API error: ${messages}`);
  return body.data ?? {};
}

async function getJson(url, init) {
  const res = await fetch(url, {
    headers: HEADERS,
    next: { revalidate: 300 },
    ...init,
  });
  if (!res.ok) throw new Error(`AllManga API responded with HTTP ${res.status}`);
  return res.json();
}

function clean(text) {
  return (text ?? "")
    .replace(/<[^>]*>?/g, " ")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, entity) => {
      if (entity[0] !== "#") return ENTITIES[entity.toLowerCase()] ?? m;
      const code = /x/i.test(entity[1]) ? parseInt(entity.slice(2), 16) : +entity.slice(1);
      return code <= 0x10ffff ? String.fromCodePoint(code) : m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function cover(thumbnail) {
  if (!thumbnail) return null;
  return /^https?:\/\//.test(thumbnail) ? thumbnail : `${CDN}/${thumbnail.replace(/^\/+/, "")}?w=250`;
}

function toCards(list = []) {
  return list.map((item) => {
    const card = item.anyCard ?? item;
    return {
      id: card._id,
      title: clean(card.name),
      englishTitle: clean(card.englishName),
      nativeTitle: clean(card.nativeName),
      cover: cover(card.thumbnail),
      score: card.score ?? null,
      availableChapters: card.availableChapters || { sub: 0, raw: 0 },
    };
  });
}

const pageCount = (total, got) => Math.min(Math.max(Math.ceil((total || got || 1) / (got || 1)), 1), 40);

export async function inlinePopular(page = 1, period = "daily", size = 20) {
  if (!Object.hasOwn(PERIODS, period)) throw new Error("period must be daily, weekly, monthly or all");
  const { queryPopular } = await gql("popular", {
    type: "manga", size, dateRange: PERIODS[period], page,
    allowAdult: false, allowUnknown: false,
  });
  const results = toCards(queryPopular?.recommendations);
  return { list: results, totalPages: pageCount(queryPopular?.total, results.length) };
}

export async function inlineLatest(page = 1) {
  return inlineSearch("", page);
}

export async function inlineSearch(query, page = 1) {
  const { mangas } = await gql("search", {
    search: { isManga: true, allowAdult: false, allowUnknown: false, ...(query ? { query } : {}) },
    limit: 26, page, translationType: "sub", countryOrigin: "ALL",
  });
  const results = toCards(mangas?.edges);
  return { list: results, totalPages: pageCount(mangas?.pageInfo?.total, results.length) };
}

export async function inlineDetail(id) {
  const { manga } = await gql("manga", { _id: id });
  if (!manga) throw new Error("Manga not found");
  const chapters = [...(manga.availableChaptersDetail?.sub ?? [])]
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => b - a);
  return {
    id: manga._id,
    title: clean(manga.name),
    englishTitle: clean(manga.englishName),
    nativeTitle: clean(manga.nativeName),
    cover: cover(manga.thumbnail),
    description: clean(manga.description),
    genres: (manga.genres ?? []).map((g) => (typeof g === "string" ? g : g?.genre || g?.name || "")).filter(Boolean),
    status: manga.status || "Unknown",
    totalChapters: manga.availableChapters?.sub || chapters.length,
    airedStart: manga.airedStart,
    chapterList: chapters.map((n) => ({
      id: `${manga._id}:sub:${n}`,
      number: n,
      title: `Chapter ${n}`,
    })),
  };
}
