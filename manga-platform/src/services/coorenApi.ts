// Cooren API client (deployed instance of github.com/CoorenLabs/CoorenLabs â€” the backend powering the Yaoi section and MangaPill catalogue).
// MangaPill provider: search â†’ detail (chapters) â†’ read (page images). Image URLs already point at the Cooren deployment's proxy.
// Trade-off: no ratings, no view counts, no timestamps. Those fields are filled with 0/'' â€” never invented.
import type {
  ApiResponse,
  NormalizedChapter,
  NormalizedChapterContent,
  NormalizedSeries,
  PaginatedResponse,
  SeriesQuery,
} from '../types';

const BASE = (import.meta.env.VITE_COREN_BASE_URL as string | undefined) ?? 'https://cooren-api.ayanbasit269.workers.dev/manga/mangapill';

const TTL = { list: 5 * 60_000, search: 10 * 60_000, detail: 5 * 60_000, chapters: 10 * 60_000, chapter: 15 * 60_000 };
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

export class CoorenApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.name = 'CoorenApiError'; this.status = status; }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  } catch {
    throw new CoorenApiError('Network error â€” check your connection.', 0);
  }
  let body: { status?: number; success?: boolean; message?: string; data?: unknown };
  try {
    body = await res.json();
  } catch {
    throw new CoorenApiError(`Unexpected response from API (HTTP ${res.status}).`, res.status);
  }
  if (!res.ok || body.success === false) {
    throw new CoorenApiError(body.message || `API request failed (HTTP ${res.status}).`, res.status);
  }
  // /image/* routes return raw bytes â€” callers use them directly via <img src>, not via this helper.
  return body.data as T;
}

export const enc = (s: string) => encodeURIComponent(s);
const arr = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);
const STATUS_MAP: Record<string, string> = { publishing: 'ongoing', ongoing: 'ongoing', finished: 'completed', completed: 'completed', hiatus: 'hiatus', dropped: 'hiatus', unknown: 'unknown' };
const yearOf = (d?: number | string | null) => (d ? String(d).slice(0, 4) : '');

interface CoorenSearchItem {
  id: string;
  title: string;
  altTitle?: string | null;
  cover?: string | null;
  type?: string | null;
  status?: string | null;
  year?: number | null;
}
interface CoorenDetail extends CoorenSearchItem {
  description?: string | null;
  genres?: string[];
  url?: string;
  chapters?: Array<{ id: string; number: number | null; title?: string | null; url?: string }>;
}

const mapSearchItem = (m: CoorenSearchItem): NormalizedSeries => ({
  id: m.id,
  title: m.title,
  slug: m.id,
  description: '',
  thumbnail: m.cover ?? '',
  cover: m.cover ?? '',
  status: STATUS_MAP[(m.status ?? '').toLowerCase()] ?? (m.status ?? 'unknown').toLowerCase(),
  type: (m.type || 'manga').toLowerCase(),
  rating: 0,
  totalViews: 0,
  alternativeNames: m.altTitle ?? '',
  author: '',
  studio: '',
  releaseYear: yearOf(m.year),
  releaseSchedule: [],
  tags: [],
  chaptersCount: 0,
  bookmarksCount: 0,
  isComingSoon: false,
  badge: null,
  createdAt: m.year ? `${m.year}-01-01T00:00:00Z` : '',
  updatedAt: '',
  chapters: [],
  url: `/series/${m.id}?source=cooren`,
  sources: [],
  source: 'cooren',
});

const mapDetailChapters = (m: CoorenDetail): NormalizedChapter[] =>
  arr(m.chapters)
    .filter((ch) => ch.number !== null && ch.number !== undefined)
    .map((ch) => ({
      id: ch.id,
      name: String(ch.number),
      title: ch.title ?? null,
      slug: ch.id, // chapter id string like "5035-10147000" â€” used for the read route
      thumbnail: '',
      createdAt: '',
      index: String(ch.number),
      url: ch.url ?? '',
    }));

export const cooren = {
  baseUrl: BASE,

  // MangaPill has no list endpoint; search acts as the catalog browser with a broad query.
  seriesList: async ({ page = 1, perPage = 20, q, status, type, genres }: SeriesQuery): Promise<PaginatedResponse<NormalizedSeries>> => {
    const query = q?.trim() || 'a'; // broad catch-all default; MangaPill returns its current top list
    const raw = await cached(`search:${query}:${page}:${perPage}:${status ?? ''}:${type ?? ''}:${(genres ?? []).join()}`, TTL.search, () =>
      get<CoorenSearchItem[]>(`/search?q=${enc(query)}`));
    let items = arr(raw).map(mapSearchItem);
    if (status) items = items.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    if (type) items = items.filter((s) => s.type.toLowerCase() === type.toLowerCase());
    if (genres?.length) items = items.filter((s) => (s.tags ?? []).some((g) => genres.includes(g.toLowerCase())));
    const pageSlice = items.slice((page - 1) * perPage, page * perPage);
    return { success: true, data: pageSlice, pagination: { total: items.length, perPage, currentPage: page, lastPage: Math.max(1, Math.ceil(items.length / perPage)), hasNext: page * perPage < items.length, hasPrevious: page > 1 } };
  },

  // Mangapill's Yaoi + Yuri genre pages â€” every series in both genres, yaoi first (no pagination upstream).
  yaoiList: async ({ q }: { q?: string } = {}): Promise<PaginatedResponse<NormalizedSeries>> => {
    const [yaoiRaw, yuriRaw] = await Promise.all([
      cached('yaoi:genre', TTL.search, () => get<CoorenSearchItem[]>('/yaoi')),
      cached('yuri:genre', TTL.search, () => get<CoorenSearchItem[]>('/yuri')),
    ]);
    let items = [...arr(yaoiRaw), ...arr(yuriRaw)].map(mapSearchItem);
    if (q?.trim()) {
      const needle = q.trim().toLowerCase();
      items = items.filter((s) => s.title.toLowerCase().includes(needle) || (s.alternativeNames ?? '').toLowerCase().includes(needle));
    }
    return { success: true, data: items, pagination: { total: items.length, perPage: items.length || 24, currentPage: 1, lastPage: 1, hasNext: false, hasPrevious: false } };
  },

  search: async (query: string, page = 1): Promise<PaginatedResponse<NormalizedSeries>> => {
    const raw = await cached(`search:${query}:1:24`, TTL.search, () => get<CoorenSearchItem[]>(`/search?q=${enc(query)}`));
    const items = arr(raw).map(mapSearchItem);
    const pageSlice = items.slice((page - 1) * 24, page * 24);
    return { success: true, data: pageSlice, pagination: { total: items.length, perPage: 24, currentPage: page, lastPage: Math.max(1, Math.ceil(items.length / 24)), hasNext: false, hasPrevious: page > 1 } };
  },

  series: (id: string): Promise<ApiResponse<NormalizedSeries>> =>
    cached(`detail:${id}`, TTL.detail, async () => {
      const raw = await get<CoorenDetail>(`/detail/${enc(id)}`);
      const chapters = mapDetailChapters(raw);
      const mapped: NormalizedSeries = {
        ...mapSearchItem(raw),
        description: raw.description ?? '',
        type: (raw.type || 'manga').toLowerCase(),
        status: STATUS_MAP[(raw.status ?? '').toLowerCase()] ?? (raw.status ?? 'unknown').toLowerCase(),
        tags: raw.genres ?? [],
        chaptersCount: chapters.length,
        updatedAt: chapters[0]?.createdAt ? '' : '',
        chapters,
      };
      return { success: true, data: mapped };
    }),

  seriesWithChapters: (id: string) => cooren.series(id),

  chapter: (slug: string, chapter: string): Promise<ApiResponse<NormalizedChapterContent>> =>
    cached(`chapter:${slug}:${chapter}`, TTL.chapter, async () => {
      const raw = await get<{ id: string; mangaId: string; title: string; number: number | null; pages: string[]; url?: string; prevChapterId: string | null; nextChapterId: string | null }>(`/read/${enc(chapter)}`);
      return {
        success: true,
        data: {
          id: raw.id,
          name: String(raw.number ?? ''),
          title: raw.title ?? null,
          slug: raw.id,
          index: raw.number ?? 0,
          images: arr(raw.pages),
          pageCount: arr(raw.pages).length,
          number: raw.number ?? 0,
          chapters: [],
          mangaId: raw.mangaId,
          mangaTitle: '', // reader resolves the title from the route or the detail call
          lastChapter: raw.prevChapterId ? { number: 0, scanlatorId: 0 } : null,
          nextChapter: raw.nextChapterId ? { number: 0, scanlatorId: 0 } : null,
          createdAt: '',
          series: { id: raw.mangaId, title: '', slug: raw.mangaId, thumbnail: '', status: '', description: '' },
          url: raw.url ?? '',
        },
      };
    }),

  random: async (count = 1): Promise<ApiResponse<NormalizedSeries | NormalizedSeries[]>> => {
    const res = await cooren.seriesList({ page: 1, perPage: 50, q: '' });
    const shuffled = [...res.data].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);
    return { success: true, data: count === 1 ? picked[0] : picked };
  },
};
