// Typed localStorage helpers ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â all keys are namespaced.
// Reading positions/bookmarks are keyed by source so the two catalogs never collide.
import type { NormalizedChapter } from '../types';

const NS = 'omega.';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* quota exceeded ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ignore */
  }
}

export type SourceName = 'omega' | 'cooren' | 'allmanga' | 'mangadex';
const src = (s?: string): SourceName => (s === 'cooren' || s === 'allmanga' || s === 'mangadex' ? s : 'omega');
const key = (source: string | undefined, slug: string) => `${src(source)}:${slug}`;

export interface HistoryEntry {
  slug: string;
  source?: SourceName;
  title: string;
  thumbnail: string;
  chapter: string;
  chapterName: string;
  page: number;
  pageCount: number;
  updatedAt: number;
}

export interface BookmarkEntry {
  slug: string;
  source?: SourceName;
  title: string;
  thumbnail: string;
  status: string;
  rating: number;
  addedAt: number;
}

const normalizeSourced = <T extends { source?: string; slug: string }>(list: T[]): T[] =>
  list.map((e) => ({ ...e, source: src(e.source) }));

type HistoryRow = HistoryEntry;
const historyKey = (h: Pick<HistoryEntry, 'slug' | 'chapter'>) => `${h.slug}::${h.chapter}`;

// Fold duplicate rows for the same reading session (same slug+chapter across sources and
// repeated saves with empty metadata) into a single, richest entry ÃƒÂ¯Ã‚Â¿Ã‚Â½ never invent data,
// just prefer non-empty fields and the newest progress.
const dedupeHistory = (list: HistoryRow[]): HistoryRow[] => {
  const merged = new Map<string, HistoryRow>();
  for (const h of list) {
    const key = historyKey(h);
    const cur = merged.get(key);
    if (!cur) {
      merged.set(key, { ...h });
      continue;
    }
    const curNewer = (h.updatedAt ?? 0) >= (cur.updatedAt ?? 0);
    merged.set(key, {
      ...cur,
      title: cur.title || h.title,
      thumbnail: cur.thumbnail || h.thumbnail,
      chapterName: cur.chapterName || h.chapterName,
      source: cur.title ? cur.source : h.title ? h.source : curNewer ? h.source : cur.source,
      page: curNewer ? h.page : cur.page,
      pageCount: Math.max(cur.pageCount || 0, h.pageCount || 0),
      updatedAt: Math.max(cur.updatedAt ?? 0, h.updatedAt ?? 0),
    });
  }
  return [...merged.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
};

export const storage = {
  history: () => dedupeHistory(normalizeSourced(read<HistoryEntry[]>('history', []))),
  saveToHistory: (entry: Omit<HistoryEntry, 'updatedAt'>) => {
    const base = dedupeHistory(normalizeSourced(read<HistoryEntry[]>('history', [])));
    const list = base.filter((h) => historyKey(h) !== historyKey(entry));
    list.unshift({ ...entry, source: src(entry.source), updatedAt: Date.now() });
    write('history', dedupeHistory(list).slice(0, 60));
  },
  clearHistory: () => write('history', []),

  readingPosition: (slug: string, chapter: string, source?: string) =>
    read<{ page: number; pageCount: number } | null>(`pos.${key(source, slug)}.${chapter}`, null),
  saveReadingPosition: (slug: string, chapter: string, page: number, pageCount: number, source?: string) =>
    write(`pos.${key(source, slug)}.${chapter}`, { page, pageCount }),
  chapterProgress: (slug: string, source?: string) => read<Record<string, number>>(`prog.${key(source, slug)}`, {}),
  saveChapterProgress: (slug: string, chapter: string, page: number, source?: string) =>
    write(`prog.${key(source, slug)}`, { ...storage.chapterProgress(slug, source), [chapter]: page }),

  bookmarks: () => normalizeSourced(read<BookmarkEntry[]>('bookmarks', [])),
  toggleBookmark: (entry: Omit<BookmarkEntry, 'addedAt'>) => {
    const list = storage.bookmarks();
    const k = key(entry.source, entry.slug);
    const exists = list.some((b) => key(b.source, b.slug) === k);
    const next = exists
      ? list.filter((b) => key(b.source, b.slug) !== k)
      : [{ ...entry, source: src(entry.source), addedAt: Date.now() }, ...list];
    write('bookmarks', next);
    return !exists;
  },
  isBookmarked: (slug: string, source?: string) => storage.bookmarks().some((b) => key(b.source, b.slug) === key(source, slug)),

  favorites: () => normalizeSourced(read<BookmarkEntry[]>('favorites', [])),
  toggleFavorite: (entry: Omit<BookmarkEntry, 'addedAt'>) => {
    const list = storage.favorites();
    const k = key(entry.source, entry.slug);
    const exists = list.some((b) => key(b.source, b.slug) === k);
    const next = exists
      ? list.filter((b) => key(b.source, b.slug) !== k)
      : [{ ...entry, source: src(entry.source), addedAt: Date.now() }, ...list];
    write('favorites', next);
    return !exists;
  },
  isFavorite: (slug: string, source?: string) => storage.favorites().some((b) => key(b.source, b.slug) === key(source, slug)),

  // Reader preferences
  readerPrefs: () =>
    read<ReaderPrefs>('readerPrefs', {
      mode: 'vertical',
      direction: 'rtl',
      imageScale: 100,
      spacing: 0.5,
      background: 'dark',
    }),
  saveReaderPrefs: (prefs: ReaderPrefs) => write('readerPrefs', prefs),

  theme: () => read<'dark' | 'light'>('theme', 'dark'),
  saveTheme: (t: 'dark' | 'light') => write('theme', t),

  ageAck: () => read<boolean>('ageAck', false),
  saveAgeAck: () => write('ageAck', true),
  clearAgeAck: () => write('ageAck', false),

  lastRead: () => {
    const e = read<HistoryEntry | null>('lastRead', null);
    return e ? { ...e, source: src(e.source) } : null;
  },
  saveLastRead: (entry: Omit<HistoryEntry, 'updatedAt'>) => write('lastRead', { ...entry, source: src(entry.source), updatedAt: Date.now() }),

  chapterLabel: (ch: NormalizedChapter) => `Chapter ${ch.name}${ch.title ? ` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ${ch.title}` : ''}`,
};

export interface ReaderPrefs {
  mode: 'vertical' | 'single' | 'double';
  direction: 'rtl' | 'ltr';
  imageScale: number; // 50ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“150 (vertical width %)
  spacing: number; // 0 = none, 1 = spacious
  background: 'black' | 'dark' | 'sepia';
}
