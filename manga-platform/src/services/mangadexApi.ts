// MangaDex Boys' Love + Girls' Love catalogues — served through the Cooren API.
// Fully internal: chapters read inside OMEGA because MangaDex serves everything
// through its own free at-home CDN, no captcha, no site-key origin lock.
import type {
  ApiResponse,
  NormalizedChapter,
  NormalizedChapterContent,
  NormalizedSeries,
  PaginatedResponse,
} from '../types';

const BASE = (import.meta.env.VITE_COREN_MANGADEX_URL as string | undefined) ?? 'https://cooren-api.ayanbasit269.workers.dev/manga/mangadex';
// covers are served through the worker's at-home-backed /cover/<id> route with 7-day cache —
// uploads.mangadex.org bot-challenges third-party hotlinking for us
const atHomeCover = (id: string) => `${BASE}/cover/${encodeURIComponent(id)}`;
const PER_PAGE = 26;

const TTL = { list: 5 * 60_000, detail: 5 * 60_000, chapter: 10 * 60_000 };
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

export class MangaDexApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.name = 'MangaDexApiError'; this.status = status; }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  } catch {
    throw new MangaDexApiError('Network error — check your connection.', 0);
  }
  let body: { status?: number; success?: boolean; message?: string; data?: unknown };
  try {
    body = await res.json();
  } catch {
    throw new MangaDexApiError(`Unexpected response from API (HTTP ${res.status}).`, res.status);
  }
  if (!res.ok || body.success === false) {
    throw new MangaDexApiError(body.message || `API request failed (HTTP ${res.status}).`, res.status);
  }
  return body.data as T;
}

interface MangaDexCard {
  id: string;
  title?: string | null;
  englishTitle?: string | null;
  nativeTitle?: string | null;
  cover?: string | null;
  thumbnail?: string | null;
  score?: number | null;
  availableChapters?: { sub?: number | null } | null;
  tags?: string[];
  status?: string | null;
  description?: string | null;
  alternativeNames?: string | null;
  author?: string | null;
  year?: number | null;
}

interface MangaDexListResponse {
  provider?: string;
  total?: number;
  page?: number;
  results?: MangaDexCard[] | null;
}

export interface MangaDexDetail extends MangaDexCard {
  isAdult?: boolean;
}

interface MangaDexChapterEntry {
  id: string;
  number?: number | null;
  title?: string | null;
  pages?: number;
}

const STATUS_MAP: Record<string, string> = {
  ongoing: 'ongoing', covered: 'completed', completed: 'completed', hiatus: 'hiatus',
  cancelled: 'hiatus', dropped: 'hiatus', unreleased: 'unknown',
};

const arr = <T>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);
const clean = (s?: string | null) => (s ?? '').trim();
const titleOf = (m: MangaDexCard) =>
  clean(m.englishTitle) || clean(m.title) || clean(m.nativeTitle) || 'Untitled';

const mapCard = (m: MangaDexCard): NormalizedSeries => {
  const available = typeof m.availableChapters?.sub === 'number' ? m.availableChapters.sub : 0;
  const coverUrl = atHomeCover(m.id);
  return {
    id: m.id,
    title: titleOf(m),
    slug: m.id,
    description: '',
    thumbnail: coverUrl,
    cover: coverUrl,
    status: STATUS_MAP[(m.status ?? '').toLowerCase()] ?? (m.status ?? 'unknown').toLowerCase(),
    type: 'yaoi',
    rating: Math.round((m.score ?? 0) * 10) / 10,
    totalViews: 0,
    alternativeNames: clean(m.alternativeNames),
    author: clean(m.author),
    studio: '',
    releaseYear: m.year ? String(m.year) : '',
    releaseSchedule: [],
    tags: arr(m.tags),
    chaptersCount: available,
    bookmarksCount: 0,
    isComingSoon: false,
    badge: null,
    createdAt: '',
    updatedAt: '',
    chapters: [],
    url: `/series/${m.id}?source=mangadex`,
    source: 'mangadex' as NormalizedSeries['source'],
    sources: [],
  };
};

export const mangadex = {
  baseUrl: BASE,

  seriesList: async ({ page = 1, q, genre = "Boys' Love" }: { page?: number; perPage?: number; q?: string; genre?: string } = {}): Promise<PaginatedResponse<NormalizedSeries>> => {
    const type = genre === "Boys' Love" ? 'BL' : 'GL';
    const query = new URLSearchParams({ type, page: String(page), limit: String(PER_PAGE) });
    if (q?.trim()) query.set('q', q.trim());
    const raw = await cached(`md:${type}:${page}:${q?.trim() ?? ''}`, TTL.list, () => get<MangaDexListResponse>(`/list?${query}`));
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

  series: (slug: string): Promise<ApiResponse<NormalizedSeries>> =>
    cached(`md:detail:${slug}`, TTL.detail, async () => {
      const [raw, chaptersData] = await Promise.all([
        get<MangaDexDetail>(`/detail?id=${encodeURIComponent(slug)}`),
        get<{ id: string; chapters: MangaDexChapterEntry[]; total: number }>(`/chapters?id=${encodeURIComponent(slug)}&limit=500`),
      ]);
      const chapters: NormalizedChapter[] = (chaptersData?.chapters ?? [])
        .filter((c) => c?.id && c?.number != null)
        .map((c) => ({
          id: c.id,
          name: String(c.number),
          title: c.title || null,
          slug: c.id,
          thumbnail: '',
          createdAt: '',
          index: String(c.number),
          url: '',
        }));
      const mapped: NormalizedSeries = {
        ...mapCard(raw),
        description: clean(raw.description),
        alternativeNames: clean(raw.alternativeNames),
        author: clean(raw.author),
        chaptersCount: chapters.length,
        tags: arr(raw.tags),
        chapters,
        url: `/series/${slug}?source=mangadex`,
      };
      return { success: true, data: mapped };
    }),

  seriesWithChapters: (slug: string) => mangadex.series(slug),

  chapter: (_slug: string, chapter: string): Promise<ApiResponse<NormalizedChapterContent>> =>
    cached(`md:pages:${chapter}`, TTL.chapter, async () => {
      const raw = await get<{ chapterId: string; images: string[]; pageCount: number }>(`/pages?chapterId=${encodeURIComponent(chapter)}`);
      const images = arr(raw?.images);
      const content: NormalizedChapterContent = {
        id: raw?.chapterId ?? chapter,
        name: '',
        title: null,
        slug: raw?.chapterId ?? chapter,
        index: 0,
        images,
        pageCount: images.length,
        number: 0,
        chapters: [],
        createdAt: '',
        series: { id: _slug, title: '', slug: _slug, thumbnail: '', status: '', description: '' },
        url: '',
      };
      return { success: true, data: content };
    }),
};
