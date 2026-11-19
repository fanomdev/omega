import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { Search, X, ChevronLeft, ChevronRight, Loader2, Heart } from 'lucide-react';
import { service } from '../services';
import { storage } from '../utils/storage';
import type { NormalizedSeries, Pagination } from '../types';
import { GridSkeleton, SeriesGrid, EmptyState, ErrorState } from '../components/common';

export default function Yaoi() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  // page is derived from the URL so deep links like /yaoi?page=2 work and reload-safe.
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const setPage = (n: number | ((p: number) => number)) => {
    const next = typeof n === 'function' ? n(page) : n;
    const p = new URLSearchParams(searchParams);
    if (debounced.trim()) p.set('q', debounced.trim()); else p.delete('q');
    if (next > 1) p.set('page', String(next)); else p.delete('page');
    setSearchParams(p, { replace: true });
  };
  const debounced = useDebounce(query, 350);
  const [data, setData] = useState<NormalizedSeries[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const p = new URLSearchParams();
    if (debounced.trim()) p.set('q', debounced.trim());
    // moving to page 1 clears the page param so the URL stays clean
    if (page > 1) p.set('page', String(page));
    setSearchParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    service.yaoiList({ page, q: debounced.trim() || undefined, sfwOnly: !storage.ageAck() })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setPagination(res.pagination);
        setNotice(res.notice ?? null);
      })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load yaoi and yuri series.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced, page, reloadKey]);

  const totalPages = pagination?.lastPage ?? 1;
  const pageNumbers = useMemo(() => {
    const arr: number[] = [];
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    for (let i = start; i <= Math.min(totalPages, start + 4); i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  return (
    <main className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-3">
        <span className="h-8 w-1.5 rounded-full bg-pink-500" />
        <div>
          <h1 className="font-display text-4xl tracking-wide text-[var(--text)] sm:text-5xl">YAOI &amp; YURI</h1>
          <p className="text-xs text-[var(--text-muted)] sm:text-sm">Boys&apos; Love &amp; Girls&apos; Love — MangaPill + MangaDex (read inside) + AllManga (10k+ titles)</p>
        </div>
        <Heart size={26} className="ml-auto text-pink-500" fill="currentColor" aria-hidden />
      </div>

      {/* Search bar */}
      <form role="search" onSubmit={(e) => e.preventDefault()} className="glass mt-6 flex items-center gap-3 rounded-2xl px-4 py-3 focus-within:border-pink-500/50 sm:px-5">
        <Search size={20} className="shrink-0 text-[var(--text-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search yaoi or yuri titles…"
          aria-label="Search yaoi and yuri series"
          className="w-full bg-transparent text-base text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] sm:text-lg"
        />
        {loading && <Loader2 size={18} className="shrink-0 animate-spin text-[var(--text-muted)]" />}
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text)]">
            <X size={18} />
          </button>
        )}
      </form>

      {/* Results */}
      <div className="mt-6" aria-live="polite">
        {error ? <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
          : loading && !data ? <GridSkeleton count={12} />
          : data && data.length === 0 ? <EmptyState title={`No yaoi or yuri series${debounced.trim() ? ` for â€œ${debounced.trim()}â€` : ''}`} hint="Try a different title, or enable 18+ mode in the navbar." />
          : data ? (
            <>
              <p className="mb-3 text-xs text-[var(--text-muted)]">{pagination?.total ?? data.length} series{debounced.trim() && <> for â€œ{debounced.trim()}â€</>}</p>
              {notice && (
                <p role="status" className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[11px] leading-snug text-amber-200">
                  {notice}
                </p>
              )}
              <SeriesGrid series={data} />
              {totalPages > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost rounded-xl p-2.5 disabled:opacity-30" aria-label="Previous page"><ChevronLeft size={18} /></button>
                  {pageNumbers.map((n) => (
                    <button key={n} onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined} className={`h-10 w-10 rounded-xl text-sm font-semibold transition ${n === page ? 'bg-pink-500 text-white' : 'btn-ghost'}`}>{n}</button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost rounded-xl p-2.5 disabled:opacity-30" aria-label="Next page"><ChevronRight size={18} /></button>
                </nav>
              )}
            </>
          ) : <GridSkeleton count={12} />}
      </div>
    </main>
  );
}
