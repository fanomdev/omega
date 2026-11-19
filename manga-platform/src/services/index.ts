// Single import point for data access.
// Mock mode: VITE_USE_MOCKS=true (offline demo dataset).
// Live mode: OmegaAPI (in-app reader) + Cooren (in-app reader) merged.
import { api as omega } from './api';
import { mock } from './mock';
import { aggregate, isMatureTitle, type Source } from './aggregate';
import { cooren } from './coorenApi';
import { allmanga } from './allmangaApi';
import { mangadex } from './mangadexApi';
import { storage } from '../utils/storage';
import type { NormalizedSeries, ApiResponse } from '../types';

export const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS as string | undefined) === 'true';
export { ApiError } from './api';

const sfwOnlyDefault = () => !storage.ageAck();
const srcOf = (s?: string): Source | undefined => (s === 'cooren' || s === 'omega' || s === 'allmanga' || s === 'mangadex' ? s : undefined);

async function resolveFrom<T>(
  source: string | undefined,
  omegaCall: () => Promise<T>,
  coorenCall: () => Promise<T>,
  allmangaCall: () => Promise<T>,
  mangadexCall: () => Promise<T>,
): Promise<T> {
  const order: Source[] = source === 'cooren'
    ? ['cooren', 'omega']
    : source === 'allmanga'
      ? ['allmanga']
      : source === 'mangadex'
        ? ['mangadex']
        : ['omega', 'cooren'];
  let lastErr: unknown;
  for (const src2 of order) {
    try {
      return await (src2 === 'omega' ? omegaCall() : src2 === 'allmanga' ? allmangaCall() : src2 === 'mangadex' ? mangadexCall() : coorenCall());
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Series not found in any source');
}

export const service = USE_MOCKS
  ? mock
  : {
      baseUrl: `${omega.baseUrl} | ${cooren.baseUrl}`,

      health: () => omega.health(),

      genres: (): Promise<ApiResponse<{ genres: string[] }>> => omega.genres(),

      seriesList: (args: import('../types').SeriesQuery & { sfwOnly?: boolean }) =>
        aggregate.browse({ ...args, sfwOnly: args.sfwOnly ?? sfwOnlyDefault() }),
      yaoiList: async ({ page = 1, q, sfwOnly }: import('../types').SeriesQuery & { sfwOnly?: boolean } = {}) => {
        const normTitle = (t: string) => (t ?? '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '');
        const seen = new Set<string>();
        const dedup = (items: import('../types').NormalizedSeries[]) => items.filter((m) => {
          const key = normTitle(m.title);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        // MangaPill + MangaDex + AllManga — dedup keeps cooren first (in-app-readable wins)
        const [mp, mdBl, mdYuri, amBl, amYuri] = await Promise.allSettled([
          page === 1 ? cooren.yaoiList({ q }) : Promise.resolve(null),
          q?.trim()
            ? mangadex.seriesList({ page, q, genre: "Boys' Love" })
            : mangadex.seriesList({ page, genre: "Boys' Love" }),
          q?.trim()
            ? mangadex.seriesList({ page, q, genre: 'Yuri' })
            : mangadex.seriesList({ page, genre: 'Yuri' }),
          q?.trim()
            ? allmanga.searchUnfiltered(q, page)
            : allmanga.seriesList({ page, genre: "Boys' Love" }),
          q?.trim()
            ? Promise.resolve(null)
            : allmanga.seriesList({ page, genre: 'Yuri' }),
        ]);
        const mpItems = (page === 1 && mp.status === 'fulfilled' && mp.value) ? mp.value.data : [];
        const mdBlItems = mdBl.status === 'fulfilled' ? mdBl.value.data : [];
        const mdYuriItems = mdYuri.status === 'fulfilled' ? mdYuri.value.data : [];
        const blItems = amBl.status === 'fulfilled' ? amBl.value.data : [];
        const yuriItems = amYuri.status === 'fulfilled' && amYuri.value ? amYuri.value.data : [];
        const amBlMeta = amBl.status === 'fulfilled' ? amBl.value.pagination : null;
        const amYuriMeta = amYuri.status === 'fulfilled' && amYuri.value ? amYuri.value.pagination : null;
        const mdBlMeta = mdBl.status === 'fulfilled' ? mdBl.value.pagination : null;
        const mdYuriMeta = mdYuri.status === 'fulfilled' ? mdYuri.value.pagination : null;
        const mangadexDown = mdBl.status === 'rejected' && mdYuri.status === 'rejected';
        const notice = page === 1 && mangadexDown
          ? 'MangaDex is temporarily rate-limited — showing MangaPill + AllManga titles.'
          : undefined;
        // dedup priority: MangaPill → MangaDex → AllManga (in-app-readable first)
        let data = dedup([...mpItems, ...mdBlItems, ...mdYuriItems, ...blItems, ...yuriItems]);
        if (sfwOnly ?? sfwOnlyDefault()) data = data.filter((m) => !isMatureTitle(m.title));
        const lastPage = Math.max(mdBlMeta?.lastPage ?? 1, mdYuriMeta?.lastPage ?? 1, amBlMeta?.lastPage ?? 1, amYuriMeta?.lastPage ?? 1);
        return {
          success: true,
          data,
          pagination: {
            total: (mdBlMeta?.total ?? 0) + (mdYuriMeta?.total ?? 0) + (amBlMeta?.total ?? 0) + (amYuriMeta?.total ?? 0) + (page === 1 ? mpItems.length : 0),
            perPage: 26,
            currentPage: page,
            lastPage,
            hasNext: page < lastPage,
            hasPrevious: page > 1,
          },
          ...(notice ? { notice } : {}),
        };
      },

      random: (count = 1, sfwOnly?: boolean) => aggregate.random(count, sfwOnly ?? sfwOnlyDefault()),

      search: (query: string, page = 1, sfwOnly?: boolean) =>
        aggregate.search(query, page, 24, sfwOnly ?? sfwOnlyDefault()),

      series: async (slug: string, source?: string): Promise<ApiResponse<NormalizedSeries>> => {
        return resolveFrom(
          srcOf(source),
          () => omega.series(slug),
          () => cooren.series(slug),
          () => allmanga.series(slug),
          () => mangadex.series(slug),
        );
      },

      seriesWithChapters: async (slug: string, source?: string): Promise<ApiResponse<NormalizedSeries>> => {
        return resolveFrom(
          srcOf(source),
          () => omega.seriesWithChapters(slug),
          () => cooren.seriesWithChapters(slug),
          () => allmanga.seriesWithChapters(slug),
          () => mangadex.seriesWithChapters(slug),
        );
      },

      chapter: async (slug: string, chapter: string, source?: string): Promise<ApiResponse<import('../types').NormalizedChapterContent>> => {
        const order: Source[] = source === 'cooren'
          ? ['cooren', 'omega']
          : source === 'omega'
            ? ['omega', 'cooren']
            : source === 'allmanga'
              ? ['allmanga']
              : source === 'mangadex'
                ? ['mangadex']
                : ['omega', 'cooren'];
        let lastErr: unknown;
        for (const src3 of order) {
          try {
            if (src3 === 'omega') return await omega.chapter(slug, chapter);
            if (src3 === 'allmanga') return await allmanga.chapter(slug, chapter);
            if (src3 === 'mangadex') return await mangadex.chapter(slug, chapter);
            return await cooren.chapter(slug, chapter);
          } catch (err) {
            lastErr = err;
          }
        }
        throw lastErr instanceof Error ? lastErr : new Error('Chapter not found in any source');
      },
    };

export type { Source };
