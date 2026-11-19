// Orchestrates reader page state: prefs, persistence, chapter list.
import { useCallback, useEffect, useRef, useState } from 'react';
import { service } from '../services';
import { storage, type ReaderPrefs } from '../utils/storage';
import type { NormalizedChapter, NormalizedChapterContent } from '../types';

const num = (c: Pick<NormalizedChapter, 'name' | 'slug'>) => {
  const n = Number(/(\d+(?:\.\d+)?)\s*$/.exec(c.name)?.[1] ?? /(\d+(?:\.\d+)?)$/.exec(c.slug)?.[1] ?? NaN);
  return Number.isFinite(n) ? n : 0;
};

export interface ChapterNav {
  chapters: NormalizedChapter[]; // ascending by chapter number
  index: number;                // position of current chapter (-1 if unknown)
  prev: NormalizedChapter | null;
  next: NormalizedChapter | null;
}

export function useReader(slug?: string, chapter?: string, source?: string) {
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => storage.readerPrefs());
  const [content, setContent] = useState<NormalizedChapterContent | null>(null);
  const [nav, setNav] = useState<ChapterNav | null>(null);
  const [seriesTitle, setSeriesTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const updatePrefs = useCallback((patch: Partial<ReaderPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      storage.saveReaderPrefs(next);
      return next;
    });
  }, []);

  // Load chapter content
  useEffect(() => {
    if (!slug || !chapter) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);
    service.chapter(slug, chapter, source)
      .then((res) => {
        if (cancelled) return;
        setContent(res.data);
        setSeriesTitle(res.data.series.title);
        const saved = storage.readingPosition(slug, chapter, source);
        setPage(saved ? Math.min(saved.page, res.data.pageCount - 1) : 0);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load this chapter.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, chapter, source, reloadKey]);

  // Load chapter list for prev/next navigation
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    service.seriesWithChapters(slug, source)
      .then((res) => {
        if (cancelled) return;
        const chapters = [...(res.data.chapters ?? [])].sort((a, b) => num(a) - num(b));
        setSeriesTitle((t) => t || res.data.title);
        const index = chapters.findIndex((c) => c.slug === chapter || String(c.name) === chapter);
        setNav({
          chapters,
          index,
          prev: index > 0 ? chapters[index - 1] : null,
          next: index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null,
        });
      })
      .catch(() => { if (!cancelled) setNav({ chapters: [], index: -1, prev: null, next: null }); });
    return () => { cancelled = true; };
  }, [slug, chapter, source]);

  const persist = useCallback((p: number, pageCount: number) => {
    if (!slug || !chapter || !content) return;
    storage.saveReadingPosition(slug, chapter, p, pageCount, source);
    storage.saveChapterProgress(slug, chapter, p, source);
    storage.saveToHistory({
      slug,
      source: (source as 'omega' | 'cooren' | 'allmanga' | 'mangadex' ) ?? 'omega',
      title: seriesTitle || content.series.title,
      thumbnail: content.thumbnail || content.series.thumbnail,
      chapter,
      chapterName: content.name,
      page: p,
      pageCount,
    });
    storage.saveLastRead({
      slug,
      source: (source as 'omega' | 'cooren' | 'allmanga' | 'mangadex' ) ?? 'omega',
      title: seriesTitle || content.series.title,
      thumbnail: content.thumbnail || content.series.thumbnail,
      chapter,
      chapterName: content.name,
      page: p,
      pageCount,
    });
  }, [slug, chapter, content, seriesTitle, source]);

  // Debounced persistence of page changes
  const saveTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!content) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => persist(page, content.pageCount), 300);
    return () => window.clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, content]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  return { prefs, updatePrefs, content, nav, seriesTitle, loading, error, page, setPage, persist, retry };
}
