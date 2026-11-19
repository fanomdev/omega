// OmegaAPI client: in-memory TTL cache + in-flight dedup.
// Base URL comes from VITE_API_BASE_URL (defaults to the public hosted API).
import type {
  ApiResponse,
  NormalizedChapter,
  NormalizedChapterContent,
  NormalizedSeries,
  PaginatedResponse,
  SeriesQuery,
} from '../types';

// Fallback must be a deployed, CORS-open backend — the Vercel build does not see .env.production.
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'https://omegapi-cf.ayanbasit269.workers.dev/api/v1';
const MEDIA_ORIGIN = 'https://media.omegascans.org';
// The upstream image CDN refuses direct hotlinks from many networks; proxy through our Worker.
const PROXY_ORIGIN = (() => { try { return new URL(BASE).origin; } catch { return ''; } })();
const imageProxy = (url: string) => `${PROXY_ORIGIN}/img?u=${encodeURIComponent(url)}`;

function rewriteImages<T>(value: T): T {
  if (typeof value === 'string') {
    return (value.startsWith(MEDIA_ORIGIN) ? imageProxy(value) : value) as unknown as T;
  }
  if (Array.isArray(value)) return value.map(rewriteImages) as unknown as T;
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      (value as Record<string, unknown>)[key] = rewriteImages((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

const TTL = {
  seriesList: 5 * 60_000,
  search: 10 * 60_000,
  detail: 5 * 60_000,
  chapters: 15 * 60_000,
  chapter: 15 * 60_000,
  random: 0, // always fresh-ish; small local TTL to survive re-renders
  genres: 30 * 60_000,
};

interface Entry {
  exp: number;
  value: unknown;
}
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

async function cached<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  if (ttl > 0) {
    const hit = cache.get(key);
    if (hit && hit.exp > Date.now()) return hit.value as T;
  }
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const p = fetcher().then((value) => {
    if (ttl > 0) cache.set(key, { exp: Date.now() + ttl, value });
    return value;
  }).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError('Network error — check your connection or the API server.', 0);
  }
  let body: { success?: boolean; error?: string } & Record<string, unknown>;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(`Unexpected response from API (HTTP ${res.status}).`, res.status);
  }
  if (!res.ok || body.success === false) {
    throw new ApiError(body.error || `API request failed (HTTP ${res.status}).`, res.status);
  }
  return rewriteImages(body) as unknown as T;
}

const enc = encodeURIComponent;

export const api = {
  baseUrl: BASE,

  health: () => cached('health', 30_000, () => get<ApiResponse<{ status: string; version: string; upstream?: { status: string } }>>('/health')),

  seriesList: ({ page = 1, perPage = 20, q, sort, order, status, type }: SeriesQuery) =>
    cached(`series:${page}:${perPage}:${q ?? ''}:${sort ?? ''}:${order ?? ''}:${status ?? ''}:${type ?? ''}`, q ? TTL.search : TTL.seriesList, () => {
      const p = new URLSearchParams();
      p.set('page', String(page));
      p.set('perPage', String(perPage));
      if (q) p.set('q', q);
      if (sort) p.set('sort', sort);
      if (order) p.set('order', order);
      if (status) p.set('status', status);
      if (type) p.set('type', type);
      return get<PaginatedResponse<NormalizedSeries>>(`/series?${p}`);
    }),

  search: (query: string, page = 1) =>
    cached(`search:${query}:${page}`, TTL.search, () => get<PaginatedResponse<NormalizedSeries>>(`/search?q=${enc(query)}&page=${page}`)),

  series: (slug: string) =>
    cached(`series:detail:${slug}`, TTL.detail, () => get<ApiResponse<NormalizedSeries>>(`/series/${enc(slug)}`)),

  seriesWithChapters: (slug: string) =>
    cached(`series:detail:${slug}:ch`, TTL.detail, () =>
      get<ApiResponse<NormalizedSeries & { chapters: NormalizedChapter[] }>>(`/series/${enc(slug)}?include=chapters`)),

  chapters: (slug: string, page = 1, perPage = 500) =>
    cached(`chapters:${slug}:${page}:${perPage}`, TTL.chapters, () =>
      get<PaginatedResponse<NormalizedChapter>>(`/series/${enc(slug)}/chapters?page=${page}&perPage=${perPage}`)),

  chapter: (slug: string, chapter: string) =>
    cached(`chapter:${slug}:${chapter}`, TTL.chapter, () =>
      get<ApiResponse<NormalizedChapterContent>>(`/chapter/${enc(slug)}/${enc(chapter)}`)),

  random: (count = 1) =>
    get<ApiResponse<NormalizedSeries | NormalizedSeries[]>>(`/random?count=${count}`),

  genres: () =>
    cached('genres', TTL.genres, () => get<ApiResponse<{ genres: string[] }>>('/genres')),
};
