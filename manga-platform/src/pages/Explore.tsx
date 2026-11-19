import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { Search, X, SlidersHorizontal, ChevronLeft, ChevronRight, Loader2, Tags } from 'lucide-react';
import { service } from '../services';
import type { NormalizedSeries, Pagination, SeriesQuery } from '../types';
import { GridSkeleton, SeriesGrid, EmptyState, ErrorState } from '../components/common';

const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'title', label: 'Title A–Z' },
] as const;

const GENRES = ['action', 'fantasy', 'romance', 'comedy', 'drama', 'adventure', 'thriller', 'mystery', 'historical', 'sci-fi', 'horror', 'martial-arts', 'isekai', 'slice-of-life', 'murim', 'supernatural'] as const;
const genreLabel = (g: string) => g.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQ = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQ);
  const [sortBy, setSortBy] = useState((searchParams.get('sortBy') as NonNullable<SeriesQuery['sortBy']>) || 'popular');
  const [genre, setGenre] = useState(searchParams.get('genre') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [type, setType] = useState(searchParams.get('type') ?? '');
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1));

  const debounced = useDebounce(query, 350);
  const [data, setData] = useState<NormalizedSeries[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Query state -> URL (shareable, back-button friendly)
  useEffect(() => {
    const p = new URLSearchParams();
    if (debounced.trim()) p.set('q', debounced.trim());
    if (sortBy !== 'popular') p.set('sortBy', sortBy);
    if (genre) p.set('genre', genre);
    if (status) p.set('status', status);
    if (type) p.set('type', type);
    if (page > 1) p.set('page', String(page));
    setSearchParams(p, { replace: true });
  }, [debounced, sortBy, genre, status, type, page, setSearchParams]);

  useEffect(() => { setPage(1); }, [debounced, sortBy, genre, status, type]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const q = debounced.trim();
    service.seriesList({ page, perPage: 24, q: q || undefined, sortBy, status: status || undefined, type: type || undefined, genres: genre ? [genre] : undefined })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load results.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced, sortBy, genre, status, type, page, reloadKey]);

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
        <span className="h-8 w-1.5 rounded-full bg-[var(--accent)]" />
        <div>
          <h1 className="font-display text-4xl tracking-wide text-[var(--text)] sm:text-5xl">EXPLORE</h1>
          <p className="text-xs text-[var(--text-muted)] sm:text-sm">All catalogues, one search — OmegaScans &amp; Cooren merged</p>
        </div>
      </div>

      {/* Search bar */}
      <form role="search" onSubmit={(e) => e.preventDefault()} className="glass mt-6 flex items-center gap-3 rounded-2xl px-4 py-3 focus-within:border-[var(--accent)]/50 sm:px-5">
        <Search size={20} className="shrink-0 text-[var(--text-muted)]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles…"
          aria-label="Search manga"
          className="w-full bg-transparent text-base text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] sm:text-lg"
        />
        {loading && <Loader2 size={18} className="shrink-0 animate-spin text-[var(--text-muted)]" />}
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text)]">
            <X size={18} />
          </button>
        )}
      </form>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]"><SlidersHorizontal size={13} /> Sort</span>
        {SORTS.map((s) => (
          <button key={s.value} onClick={() => setSortBy(s.value as typeof sortBy)} className={`chip ${sortBy === s.value ? 'chip-active' : ''}`}>{s.label}</button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]"><Tags size={13} /> Genre</span>
        <button onClick={() => setGenre('')} className={`chip ${genre === '' ? 'chip-active' : ''}`}>All</button>
        {GENRES.map((g) => (
          <button key={g} onClick={() => setGenre(genre === g ? '' : g)} className={`chip ${genre === g ? 'chip-active' : ''}`}>{genreLabel(g)}</button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Status</span>
        {[['', 'All'], ['ongoing', 'Ongoing'], ['completed', 'Completed'], ['hiatus', 'Hiatus']].map(([v, label]) => (
          <button key={v || 'all'} onClick={() => setStatus(v)} className={`chip ${status === v ? 'chip-active' : ''}`}>{label}</button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Type</span>
        {[['', 'All'], ['manga', 'Manga'], ['manhwa', 'Manhwa'], ['manhua', 'Manhua']].map(([v, label]) => (
          <button key={v || 'all'} onClick={() => setType(v)} className={`chip ${type === v ? 'chip-active' : ''}`}>{label}</button>
        ))}
      </div>

      {/* Results */}
      <div className="mt-6" aria-live="polite">
        {error ? <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
          : loading && !data ? <GridSkeleton count={12} />
          : data && data.length === 0 ? <EmptyState title={`No results${debounced.trim() ? ` for “${debounced.trim()}”` : ''}`} hint="Try a different title, or clear the filters above." />
          : data ? (
            <>
              <p className="mb-3 text-xs text-[var(--text-muted)]">{pagination?.total ?? data.length} series{debounced.trim() && <> for “{debounced.trim()}”</>}</p>
              <SeriesGrid series={data} />
              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost rounded-xl p-2.5 disabled:opacity-30" aria-label="Previous page"><ChevronLeft size={18} /></button>
                  {pageNumbers.map((n) => (
                    <button key={n} onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined} className={`h-10 w-10 rounded-xl text-sm font-semibold transition ${n === page ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'btn-ghost'}`}>{n}</button>
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
