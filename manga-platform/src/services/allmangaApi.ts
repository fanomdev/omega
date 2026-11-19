// AllManga Girls' Love + Boys' Love catalogues — served through the Cooren API.
// Catalog/detail works serverless; chapter pages still need mkissa.to (captcha wall).
import type {
  ApiResponse,
  NormalizedChapter,
  NormalizedChapterContent,
  NormalizedSeries,
  PaginatedResponse,
} from '../types';

const BASE = (import.meta.env.VITE_COREN_ALLMANGA_URL as string | undefined) ?? 'https://cooren-api.ayanbasit269.workers.dev/manga/allmanga';
const PER_PAGE = 26;
const mkissa = (id: string) => `https://mkissa.to/manga/${encodeURIComponent(id)}`;
const MULTI_TAGS: Record<string, string> = {
  // merged across every AllManga tag that holds Yaoi/Yuri content; backend fan-out dedups per page
  "Boys' Love": 'theme:boys_love,theme:shounen_ai,theme:gay_seme', // ~7,438 + ~4,071 + ~22 tagged entries
  Yuri: 'theme:yuri,theme:shoujo_ai,theme:lesbian_s', // ~2,783 + ~2,356 + ~29 tagged entries
};
// AllManga's /image/ path prefixes the raw image referrer host, so the worker can proxy through to embeds.
const proxyCover = (url: string | null | undefined) => {
  const clean = (url ?? '').trim();
  if (!clean) return '';
  const withoutProtocol = clean.replace(/^https?:\/\//, '');
  return `${BASE}/image/${withoutProtocol}`;
};

const TTL = { list: 5 * 60_000, detail: 5 * 60_000 };
interface Entry { exp: number; value: unknown }
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

async function cached<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  if (ttl > 0) { const hit = cache.get(key); if (hit && hit.exp > Date.now()) return hit.value as T; }
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const p = fetcher().then((v) => { if (ttl > 0) cache.set(key, { exp: Date.now() + ttl, value: v }); return v; }).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export class AllMangaApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.name = 'AllMangaApiError'; this.status = status; }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  } catch {
    throw new AllMangaApiError('Network error — check your connection.', 0);
  }
  let body: { status?: number; success?: boolean; message?: string; data?: unknown };
  try {
    body = await res.json();
  } catch {
    throw new AllMangaApiError(`Unexpected response from API (HTTP ${res.status}).`, res.status);
  }
  if (!res.ok || body.success === false) {
    throw new AllMangaApiError(body.message || `API request failed (HTTP ${res.status}).`, res.status);
  }
  return body.data as T;
}

const enc = (s: string) => encodeURIComponent(s);
const arr = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);

interface AllMangaCard {
  id: string;
  title?: string | null;
  englishTitle?: string | null;
  nativeTitle?: string | null;
  cover?: string | null;
  thumbnail?: string | null;
  score?: number | null;
  availableChapters?: { sub?: number } | null;
}
interface AllMangaListResponse {
  provider?: string;
  total?: number;
  page?: number;
  results?: AllMangaCard[] | null;
}
interface AllMangaChapterEntry {
  id: string;
  number?: number | null;
  title?: string | null;
}
interface AllMangaDetail extends AllMangaCard {
  description?: string | null;
  status?: string | null;
  genres?: string[] | null;
  authors?: string[] | null;
  airedStart?: { year?: number; month?: number; date?: number } | string | null;
  chapterList?: AllMangaChapterEntry[] | null;
}

const clean = (s?: string | null) => {
  const t = (s ?? '').trim();
  return t && t !== 'undefined' ? t : '';
};
const titleOf = (m: AllMangaCard | AllMangaDetail) =>
  clean(m.englishTitle) || clean(m.title) || clean(m.nativeTitle) || 'Untitled';
const coverOf = (m: AllMangaCard | AllMangaDetail) => clean(m.cover) || clean(m.thumbnail);

const mapCard = (m: AllMangaCard): NormalizedSeries => {
  const coverUrl = proxyCover(coverOf(m));
  return {
    id: m.id,
    title: titleOf(m),
    slug: m.id,
    description: '',
    thumbnail: coverUrl,
    cover: coverUrl,
    status: 'unknown',
    type: 'yaoi',
    rating: Math.round((m.score ?? 0) * 10) / 10,
    totalViews: 0,
    alternativeNames: clean(m.nativeTitle),
    author: '',
    studio: '',
    releaseYear: '',
    releaseSchedule: [],
    tags: ["Boys' Love"],
    chaptersCount: m.availableChapters?.sub ?? 0,
    bookmarksCount: 0,
    isComingSoon: false,
    badge: null,
    createdAt: '',
    updatedAt: '',
    chapters: [],
    url: `/series/${m.id}?source=allmanga`,
    source: 'allmanga' as NormalizedSeries['source'],
    sources: [],
  };
};

export const allmanga = {
  baseUrl: BASE,

  seriesList: async ({ page = 1, q, genre = "Boys' Love" }: { page?: number; perPage?: number; q?: string; genre?: string } = {}): Promise<PaginatedResponse<NormalizedSeries>> => {
    const slug = MULTI_TAGS[genre] ?? genre;
    const query = new URLSearchParams({ name: genre, page: String(page), limit: String(PER_PAGE) });
    if (q?.trim()) query.set('q', q.trim()); // text search fallback for untagged works
    const raw = await cached(`bl:${genre}:${page}:${q?.trim() ?? ''}`, TTL.list, () => get<AllMangaListResponse>(`/genreList/${encodeURIComponent(slug)}?${query}`));
    const items = arr(raw?.results).filter((r) => r?.id).map(mapCard);
    const total = raw?.total ?? 0;
    const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
    return {
      success: true,
      data: items,
      pagination: {
        total,
        perPage: PER_PAGE,
        currentPage: page,
        lastPage,
        hasNext: page < lastPage,
        hasPrevious: page > 1,
      },
    };
  },

  search: (query: string, page = 1) => allmanga.seriesList({ page, q: query, genre: "Boys' Love" }),

  // unfiltered full-catalog text search (no genre constraint) — returns results beyond any single tag
  searchUnfiltered: async (query: string, page = 1): Promise<PaginatedResponse<NormalizedSeries>> => {
    const raw = await cached(`allmanga:unfiltered:${query}:${page}`, TTL.list, () => get<AllMangaListResponse>(`/search?q=${enc(query)}&page=${page}`));
    const items = arr(raw?.results).filter((r) => r?.id).map(mapCard);
    const total = raw?.total ?? items.length;
    return {
      success: true,
      data: items,
      pagination: { total, perPage: 26, currentPage: page, lastPage: 1, hasNext: false, hasPrevious: false },
    };
  },

  series: (slug: string): Promise<ApiResponse<NormalizedSeries>> =>
    cached(`detail:${slug}`, TTL.detail, async () => {
      const raw = await get<AllMangaDetail>(`/detail?id=${enc(slug)}`);
      const chapters: NormalizedChapter[] = arr(raw.chapterList)
        .filter((c) => c?.id)
        .map((c) => ({
          id: c.id,
          name: c.number != null ? String(c.number) : '',
          title: c.title || null,
          slug: c.id,
          thumbnail: '',
          createdAt: '',
          index: c.number != null ? String(c.number) : '',
          url: mkissa(slug),
        }));
      const mapped: NormalizedSeries = {
        ...mapCard(raw),
        description: raw.description ?? '',
        status: (raw.status ?? 'unknown').toLowerCase(),
        author: arr(raw.authors).map((a: unknown) => (typeof a === 'string' ? a : '')).filter(Boolean).join(', '),
        chapters,
        chaptersCount: chapters.length,
        cover: proxyCover(coverOf(raw)),
        thumbnail: proxyCover(coverOf(raw)),
        url: mkissa(slug),
      };
      return { success: true, data: mapped };
    }),

  seriesWithChapters: (slug: string) => allmanga.series(slug),

  chapter: (_slug: string, _chapter: string): Promise<ApiResponse<NormalizedChapterContent>> => {
    void _slug; void _chapter;
    throw new AllMangaApiError('AllManga chapters open on mkissa.to — use the “Read on AllManga” button.', 400);
  },
};
