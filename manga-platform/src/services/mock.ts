// Mock service â€” SAME surface as ./api. Used only when VITE_USE_MOCKS=true.
// Data is invented demo content (original titles/artwork) so the UI is fully
// explorable offline. Never silently mixed with real API mode.
import type {
  ApiResponse,
  NormalizedChapter,
  NormalizedChapterContent,
  NormalizedSeries,
  PaginatedResponse,
  SeriesQuery,
} from '../types';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

interface Fixture extends Omit<NormalizedSeries, 'chapters'> {
  chapterTotal: number;
  latestDaysAgo: number;
}

const fixtures: Fixture[] = [
  { id: 1, title: 'Iron Sovereign', slug: 'iron-sovereign', description: 'Betrayed and left for dead on the ashfields of the Shattered March, a disgraced general-in-exile reforges himself from salvaged war iron â€” and returns to claim the nine legions.', thumbnail: '/mock/covers/iron-sovereign.svg', cover: '/mock/covers/iron-sovereign.svg', status: 'ongoing', type: 'manhwa', rating: 4.9, totalViews: 18400000, alternativeNames: 'Iron Sovereign of the March', author: 'Kagura Solace', studio: 'Forgehouse', releaseYear: '2023', releaseSchedule: ['Monday', 'Thursday'], tags: ['Action', 'Dark Fantasy', 'Martial Arts', 'Revenge'], chaptersCount: 87, bookmarksCount: 220000, isComingSoon: false, badge: 'HOT', createdAt: daysAgo(900), updatedAt: daysAgo(1), url: '/series/iron-sovereign', chapterTotal: 87, latestDaysAgo: 1 },
  { id: 2, title: 'Moonlit Alchemist', slug: 'moonlit-alchemist', description: 'A royal alchemist who can only brew under a full moon flees the palace intrigue she was born into, carrying the one formula every noble house would kill for.', thumbnail: '/mock/covers/moonlit-alchemist.svg', cover: '/mock/covers/moonlit-alchemist.svg', status: 'ongoing', type: 'manhwa', rating: 4.8, totalViews: 12100000, alternativeNames: 'The Alchemist of the Waxing Moon', author: 'Rin Tsubasa', studio: 'Atelier Nocturne', releaseYear: '2024', releaseSchedule: ['Tuesday'], tags: ['Fantasy', 'Mystery', 'Romance', 'Slice of Life'], chaptersCount: 54, bookmarksCount: 148000, isComingSoon: false, badge: null, createdAt: daysAgo(700), updatedAt: daysAgo(2), url: '/series/moonlit-alchemist', chapterTotal: 54, latestDaysAgo: 2 },
  { id: 3, title: 'Zero Hour Courier', slug: 'zero-hour-courier', description: 'In a rain-drenched megacity, a courier with a 60-minute memory delivers packages she can never remember â€” including one marked with her own name.', thumbnail: '/mock/covers/zero-hour-courier.svg', cover: '/mock/covers/zero-hour-courier.svg', status: 'ongoing', type: 'manhwa', rating: 4.7, totalViews: 9800000, alternativeNames: 'Zero Hour', author: 'Dex Marlowe', studio: 'Nightshift Works', releaseYear: '2024', releaseSchedule: ['Wednesday', 'Saturday'], tags: ['Cyberpunk', 'Sci-Fi', 'Thriller', 'Action'], chaptersCount: 41, bookmarksCount: 96000, isComingSoon: false, badge: 'NEW', createdAt: daysAgo(520), updatedAt: daysAgo(0), url: '/series/zero-hour-courier', chapterTotal: 41, latestDaysAgo: 0 },
  { id: 4, title: 'Blade of the Ninth Heaven', slug: 'blade-ninth-heaven', description: 'The last swordsman of a disgraced clan crosses a warring Japan to collect the nine souls that killed his master â€” one heaven at a time.', thumbnail: '/mock/covers/blade-ninth-heaven.svg', cover: '/mock/covers/blade-ninth-heaven.svg', status: 'ongoing', type: 'manga', rating: 4.9, totalViews: 15200000, alternativeNames: 'Ninth Heaven Blade', author: 'Jin Kazama', studio: 'Inkstone', releaseYear: '2022', releaseSchedule: ['Friday'], tags: ['Action', 'Samurai', 'Revenge', 'Seinen'], chaptersCount: 102, bookmarksCount: 187000, isComingSoon: false, badge: null, createdAt: daysAgo(1100), updatedAt: daysAgo(3), url: '/series/blade-ninth-heaven', chapterTotal: 102, latestDaysAgo: 3 },
  { id: 5, title: 'Tower of Silent Stars', slug: 'tower-silent-stars', description: 'A failed exam candidate wakes at the foot of a tower that appears once a millennium. Every floor grants a power; every silence at the top eats a name.', thumbnail: '/mock/covers/tower-silent-stars.svg', cover: '/mock/covers/tower-silent-stars.svg', status: 'ongoing', type: 'manhwa', rating: 4.6, totalViews: 8900000, alternativeNames: '', author: 'Hyejin Baek', studio: 'Vertical Nine', releaseYear: '2025', releaseSchedule: ['Saturday', 'Sunday'], tags: ['Isekai', 'Fantasy', 'Adventure', 'Action'], chaptersCount: 63, bookmarksCount: 84000, isComingSoon: false, badge: null, createdAt: daysAgo(400), updatedAt: daysAgo(5), url: '/series/tower-silent-stars', chapterTotal: 63, latestDaysAgo: 5 },
  { id: 6, title: 'The Last Cartographer', slug: 'last-cartographer', description: 'When the worldâ€™s maps begin to lie, the last honest cartographer sets out to redraw the edge of the world â€” and finds the edge is closer than anyone imagined.', thumbnail: '/mock/covers/last-cartographer.svg', cover: '/mock/covers/last-cartographer.svg', status: 'completed', type: 'manhua', rating: 4.8, totalViews: 7400000, alternativeNames: 'Cartographerâ€™s End', author: 'Marisol Vane', studio: 'Compass & Co', releaseYear: '2021', releaseSchedule: [], tags: ['Adventure', 'Mystery', 'Fantasy'], chaptersCount: 78, bookmarksCount: 91000, isComingSoon: false, badge: null, createdAt: daysAgo(1400), updatedAt: daysAgo(120), url: '/series/last-cartographer', chapterTotal: 78, latestDaysAgo: 120 },
  { id: 7, title: 'Ember & Ash', slug: 'ember-and-ash', description: 'She is the fire that burned the capital; he is the only witness who remembers it before the lie. A supernatural romance written in cinders.', thumbnail: '/mock/covers/ember-and-ash.svg', cover: '/mock/covers/ember-and-ash.svg', status: 'completed', type: 'manhwa', rating: 4.7, totalViews: 11300000, alternativeNames: '', author: 'Jun Park', studio: 'Cinderworks', releaseYear: '2022', releaseSchedule: [], tags: ['Romance', 'Supernatural', 'Drama'], chaptersCount: 46, bookmarksCount: 132000, isComingSoon: false, badge: null, createdAt: daysAgo(1250), updatedAt: daysAgo(200), url: '/series/ember-and-ash', chapterTotal: 46, latestDaysAgo: 200 },
  { id: 8, title: 'God of the Underground', slug: 'god-underground', description: 'Locked out of the official hunter ranks, adungeon sweeper discovers that the lowest floor of the underground holds a job posting meant for a god.', thumbnail: '/mock/covers/god-underground.svg', cover: '/mock/covers/god-underground.svg', status: 'ongoing', type: 'manhwa', rating: 4.8, totalViews: 21000000, alternativeNames: 'Underground God', author: 'Sungho Woo', studio: 'Apex Frame', releaseYear: '2023', releaseSchedule: ['Monday', 'Friday'], tags: ['Action', 'Fantasy', 'Adventure', 'Martial Arts'], chaptersCount: 95, bookmarksCount: 260000, isComingSoon: false, badge: 'HOT', createdAt: daysAgo(980), updatedAt: daysAgo(1), url: '/series/god-underground', chapterTotal: 95, latestDaysAgo: 1 },
];

const mkChapter = (f: Fixture, n: number): NormalizedChapter => ({
  id: `${f.id}-ch-${n}`,
  name: String(n),
  title: null,
  slug: String(n),
  thumbnail: '',
  createdAt: daysAgo(f.latestDaysAgo + (f.chapterTotal - n) * 7),
  index: String(n),
  scanlatorId: 1,
  pages: 8,
  url: `/read/${f.id}/${n}`,
});

const chaptersOf = (f: Fixture): NormalizedChapter[] =>
  Array.from({ length: f.chapterTotal }, (_, i) => mkChapter(f, f.chapterTotal - i)); // newest first

const listSeries = (f: Fixture): NormalizedSeries => {
  const { chapterTotal: _c, latestDaysAgo: _l, ...rest } = f;
  return { ...rest, chapters: [] };
};
const detailSeries = (f: Fixture): NormalizedSeries => {
  const { chapterTotal: _c, latestDaysAgo: _l, ...rest } = f;
  return { ...rest, chapters: chaptersOf(f) };
};

const pageFor = (slug: string, chapterN: number): string[] => {
  const offset = (slug.length + chapterN) % 8;
  return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `/mock/pages/page-${(((offset + i) % 8) + 1)}.svg`);
};
const delay = <T,>(v: T): Promise<T> => new Promise((r) => setTimeout(() => r(v), 120));
const paginate = <T,>(items: T[], page: number, perPage: number): PaginatedResponse<T> => {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page), lastPage);
  return {
    success: true,
    data: items.slice((p - 1) * perPage, p * perPage),
    pagination: { total, perPage, currentPage: p, lastPage, hasNext: p < lastPage, hasPrevious: p > 1 },
  };
};
const applyQuery = (sorted: Fixture[], { q, status, type }: SeriesQuery) =>
  sorted.filter((f) =>
    (!q || f.title.toLowerCase().includes(q.toLowerCase())) &&
    (!status || f.status === status) &&
    (!type || f.type === type));

const sortBy = (arr: Fixture[], sort?: SeriesQuery['sort'], order: 'asc' | 'desc' = 'desc') => {
  const dir = order === 'asc' ? 1 : -1;
  const key: Record<string, (f: Fixture) => number | string> = {
    title: (f) => f.title.toLowerCase(),
    rating: (f) => f.rating,
    views: (f) => f.totalViews,
    updated: (f) => new Date(f.updatedAt).getTime(),
  };
  if (!sort) return [...arr].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const k = key[sort];
  return [...arr].sort((a, b) => {
    const av = k(a); const bv = k(b);
    return typeof av === 'string' ? dir * av.localeCompare(bv as string) : dir * ((av as number) - (bv as number));
  });
};

export const mock = {
  baseUrl: 'mock://offline',

  health: async () => delay<ApiResponse<{ status: string; version: string }>>({ success: true, data: { status: 'ok', version: 'mock' } }),

  seriesList: async (query: SeriesQuery): Promise<PaginatedResponse<NormalizedSeries>> => {
    const { page = 1, perPage = 20 } = query;
    const filtered = applyQuery(sortBy(fixtures, query.sort, query.order), query);
    return delay(paginate(filtered.map(listSeries), page, perPage));
  },

  yaoiList: (query: SeriesQuery & { sfwOnly?: boolean }): Promise<PaginatedResponse<NormalizedSeries>> =>
    Promise.resolve(mock.seriesList({ ...query, perPage: query.perPage ?? 24 })),

  search: async (query: string, page = 1, _sfwOnly?: boolean): Promise<PaginatedResponse<NormalizedSeries>> => {
    const filtered = sortBy(fixtures.filter((f) => f.title.toLowerCase().includes(query.toLowerCase())));
    return delay(paginate(filtered.map(listSeries), page, 20));
  },

  series: async (slug: string): Promise<ApiResponse<NormalizedSeries>> => {
    const f = fixtures.find((x) => x.slug === slug);
    if (!f) throw new Error('Series not found');
    return delay({ success: true, data: listSeries(f) });
  },

  seriesWithChapters: async (slug: string): Promise<ApiResponse<NormalizedSeries & { chapters: NormalizedChapter[] }>> => {
    const f = fixtures.find((x) => x.slug === slug);
    if (!f) throw new Error('Series not found');
    return delay({ success: true, data: detailSeries(f) });
  },

  chapters: async (slug: string, page = 1, perPage = 500): Promise<PaginatedResponse<NormalizedChapter>> => {
    const f = fixtures.find((x) => x.slug === slug);
    if (!f) throw new Error('Series not found');
    return delay(paginate(chaptersOf(f), page, perPage));
  },

  chapter: async (slug: string, chapter: string): Promise<ApiResponse<NormalizedChapterContent>> => {
    const f = fixtures.find((x) => String(x.slug) === slug || x.id === slug);
    const m = /^(\d+)$/.exec(chapter);
    if (!f || !m) throw new Error('Chapter not found');
    const n = parseInt(m[1], 10);
    const images = pageFor(slug, n);
    return delay({
      success: true,
      data: {
        id: `${f.id}-ch-${n}`,
        name: String(n),
        title: null,
        slug: String(n),
        index: String(n),
        type: f.type,
        price: 0,
        isFree: true,
        thumbnail: f.thumbnail,
        images,
        pageCount: images.length,
        createdAt: daysAgo(f.latestDaysAgo + (f.chapterTotal - n) * 7),
        series: { id: f.id, title: f.title, slug: f.slug, thumbnail: f.thumbnail, status: f.status, description: f.description },
        url: `/read/${f.slug}/${n}`,
      },
    });
  },

  random: async (count = 1, _sfwOnly?: boolean): Promise<ApiResponse<NormalizedSeries | NormalizedSeries[]>> => {
    const picks = [...fixtures].sort(() => Math.random() - 0.5).slice(0, count).map(listSeries);
    return delay({ success: true, data: count === 1 ? picks[0] : picks });
  },

  genres: async () => delay({ success: true, data: { genres: ['Action','Adult','Comedy','Drama','Fantasy','Harem','Horror','Isekai','Martial Arts','Mature','Mystery','Psychological','Romance','School Life','Sci-Fi','Seinen','Shounen','Slice of Life','Supernatural','Thriller','Tragedy','Webtoon','Yaoi','Yuri'] } }),
};
