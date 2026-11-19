// Aggregates OmegaAPI (in-app reader) and Cooren (in-app reader).
// Every merged item is tagged with `source`. Dedup by normalized title; Omega/Cooren win ties.
import { api as omega } from './api';
import { cooren } from './coorenApi';
import type { NormalizedSeries, PaginatedResponse, SeriesQuery } from '../types';

export type Source = 'omega' | 'cooren' | 'allmanga' | 'mangadex';

export const titleKey = (t: string) =>
  (t || '').toLowerCase()
    .replace(/[ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“`]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Crude SFW filter ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â the front page stays clean until the 18+ switch is flipped.
const MATURE = /\b(sex\w*|milf|hentai|porn\w*|xxx|lewd|mature|ecchi|ahegao|nude|nudity|erot\w*|naked|threesome|creampie|incest|bestial|bukkake|nakadashi|nsfw|seduc\w*|taboo|glory\s*hole|deflor\w*|virgin\w*|paizuri|cheat\w*|humiliat\w*|pregnant\w*|home-wrecking|female\s+dominance|domina\w*)\b/i;
export const isMatureTitle = (title: string) => MATURE.test(title || '');

const normalizeOmega = (s: NormalizedSeries): NormalizedSeries =>
  ({ ...s, rating: Math.min(10, Math.max(0, (s.rating ?? 0) * 2)), source: 'omega' as Source });
const normalizeCooren = (s: NormalizedSeries): NormalizedSeries =>
  ({ ...s, source: 'cooren' as Source });

const dedup = (items: NormalizedSeries[]): NormalizedSeries[] => {
  const rank = (s: Source | undefined) => (s === 'omega' || s === 'cooren' ? 3 : 1);
  const seen = new Map<string, NormalizedSeries>();
  for (const item of items) {
    const key = titleKey(item.title);
    const existing = seen.get(key);
    if (!existing) { seen.set(key, item); continue; }
    if (rank(item.source) !== rank(existing.source)) {
      if (rank(item.source) > rank(existing.source)) seen.set(key, item);
      continue;
    }
    if ((item.rating ?? 0) > (existing.rating ?? 0)) seen.set(key, item);
  }
  return [...seen.values()];
};

const merge = (...lists: NormalizedSeries[][]): NormalizedSeries[] => dedup(lists.flat());

const by = (field: 'views' | 'rating' | 'updated') => (a: NormalizedSeries, b: NormalizedSeries) =>
  field === 'updated'
    ? new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    : (b[field === 'views' ? 'totalViews' : 'rating'] ?? 0) - (a[field === 'views' ? 'totalViews' : 'rating'] ?? 0);

const paginate = (items: NormalizedSeries[], page: number, perPage: number): PaginatedResponse<NormalizedSeries> => {
  const last = Math.max(1, Math.ceil(items.length / perPage));
  const p = Math.min(Math.max(1, page), last);
  return { success: true, data: items.slice((p - 1) * perPage, p * perPage), pagination: { total: items.length, perPage, currentPage: p, lastPage: last, hasNext: p < last, hasPrevious: p > 1 } };
};

const OFFL = (kind: string) => (err: unknown): NormalizedSeries[] => {
  if (import.meta.env.DEV) console.warn(`[aggregate] ${kind} failed:`, err);
  return [];
};

export const aggregate = {
  /** Merged browse for home/explore/latest. Applies SFW filter when sfwOnly. */
  browse: async ({ page = 1, perPage = 24, sortBy = 'views', q, status, type, genres, sfwOnly = true }: SeriesQuery & { sfwOnly?: boolean } = {}): Promise<PaginatedResponse<NormalizedSeries>> => {
    const [o, s] = await Promise.allSettled([
      omega.seriesList({ page, perPage, q, status, type, sort: sortBy === 'title' ? 'title' : sortBy === 'views' || sortBy === 'popular' ? 'views' : sortBy === 'rating' ? 'rating' : 'updated', order: 'desc' }),
      cooren.seriesList({ page, perPage, q, status, types: type ? [type] : undefined, genres, sortBy: 'popular' }),
    ]);
    let merged = merge(
      o.status === 'fulfilled' ? o.value.data.map(normalizeOmega) : OFFL('omega')(o.status === 'rejected' ? o.reason : undefined),
      s.status === 'fulfilled' ? s.value.data.map(normalizeCooren) : OFFL('cooren')(s.status === 'rejected' ? s.reason : undefined),
    );
    if (sortBy === 'views' || sortBy === 'popular') merged = [...merged].sort(by('views'));
    else if (sortBy === 'rating') merged = [...merged].sort(by('rating'));
    else if (sortBy === 'title') merged = [...merged].sort((aa, bb) => aa.title.localeCompare(bb.title));
    else merged = [...merged].sort(by('updated'));
    if (sfwOnly) merged = merged.filter((m) => m.source !== 'omega' && !isMatureTitle(m.title));
    return paginate(merged, page, perPage) as unknown as PaginatedResponse<NormalizedSeries>;
  },

  latest: (sfwOnly = true, page = 1, perPage = 12) =>
    aggregate.browse({ page, perPage, sortBy: 'updated', sfwOnly }),

  popular: (sfwOnly = true, page = 1, perPage = 24) =>
    aggregate.browse({ page, perPage, sortBy: 'views', sfwOnly }),

  search: async (query: string, page = 1, perPage = 24, sfwOnly = true): Promise<PaginatedResponse<NormalizedSeries>> => {
    const [o, s] = await Promise.allSettled([omega.search(query, page), cooren.search(query, page)]);
    let merged = merge(
      o.status === 'fulfilled' ? o.value.data.map(normalizeOmega) : OFFL('omega')(o.status === 'rejected' ? o.reason : undefined),
      s.status === 'fulfilled' ? s.value.data.map(normalizeCooren) : OFFL('cooren')(s.status === 'rejected' ? s.reason : undefined),
    );
    merged = [...merged].sort(by('views'));
    if (sfwOnly) merged = merged.filter((m) => m.source !== 'omega' && !isMatureTitle(m.title));
    return paginate(merged, page, perPage);
  },

  random: async (count = 1, sfwOnly = true) => {
    const res = await aggregate.popular(sfwOnly, 1 + Math.floor(Math.random() * 3), 24);
    const shuffled = [...res.data].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);
    return { success: true, data: count === 1 ? picked[0] : picked };
  },
};
