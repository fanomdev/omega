import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Play, Pause, BookOpen, Heart, Bookmark, BookmarkCheck, ArrowLeft, Search, ArrowUpDown, CalendarDays, Building2, PenTool, ChevronDown, Star } from 'lucide-react';
import { service } from '../services';
import type { NormalizedSeries, NormalizedChapter } from '../types';
import { storage } from '../utils/storage';
import { formatCount, timeAgo, capitalize, statusColor } from '../utils/format';
import { ErrorState } from '../components/common';
import { useToast } from '../context/ToastContext';
import { firstChapterSlug } from '../components/HeroSection';

const PAGE = 60;

export default function MangaDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const source = (searchParams.get('source') === 'cooren' ? 'cooren' : searchParams.get('source') === 'allmanga' ? 'allmanga' : searchParams.get('source') === 'mangadex' ? 'mangadex' : 'omega') as 'omega' | 'cooren' | 'allmanga' | 'mangadex';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [series, setSeries] = useState<(NormalizedSeries & { chapters: NormalizedChapter[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [chapterQuery, setChapterQuery] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);
  const [visible, setVisible] = useState(PAGE);
  const [bookmarked, setBookmarked] = useState(() => storage.isBookmarked(slug ?? '', source));
  const [favorited, setFavorited] = useState(() => storage.isFavorite(slug ?? '', source));
  const [progress, setProgress] = useState<Record<string, number>>(() => storage.chapterProgress(slug ?? '', source));

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setSeries(null);
    setError(null);
    setProgress(storage.chapterProgress(slug, source));
    service.seriesWithChapters(slug, source)
      .then((res) => {
        if (cancelled) return;
        setSeries({ ...res.data, chapters: [...(res.data.chapters ?? [])] });
      })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load this series.'); });
    return () => { cancelled = true; };
  }, [slug, source, reloadKey]);

  const chapterList = useMemo(() => {
    if (!series) return [];
    let list = [...series.chapters];
    const q = chapterQuery.trim().toLowerCase();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.title ?? '').toLowerCase().includes(q));
    const num = (c: NormalizedChapter) => { const n = Number(c.name); return Number.isFinite(n) ? n : 0; };
    list.sort((a, b) => (newestFirst ? num(b) - num(a) : num(a) - num(b)));
    return list;
  }, [series, chapterQuery, newestFirst]);

  const historyEntry = useMemo(() => storage.history().find((h) => h.slug === slug && h.source === source), [slug, source]);
  const firstCh = series ? firstChapterSlug(series) : 'chapter-1';
  const continueTarget = historyEntry?.chapter;

  const toggleBookmark = () => {
    if (!series) return;
    const added = storage.toggleBookmark({ slug: series.slug, source, title: series.title, thumbnail: series.thumbnail, status: series.status, rating: series.rating });
    setBookmarked(added);
    toast(added ? 'Added to your library' : 'Removed from your library', 'success');
  };
  const toggleFavorite = () => {
    if (!series) return;
    const added = storage.toggleFavorite({ slug: series.slug, source, title: series.title, thumbnail: series.thumbnail, status: series.status, rating: series.rating });
    setFavorited(added);
    toast(added ? 'Added to favorites' : 'Removed from favorites', 'success');
  };

  if (error) return <main className="mx-auto max-w-7xl px-4 py-20"><ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} /></main>;
  if (!series) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="skeleton h-64 w-full rounded-3xl" />
        <div className="mt-6 grid gap-6 md:grid-cols-[280px_1fr]"><div className="skeleton aspect-[2/3] rounded-2xl" /><div className="space-y-4"><div className="skeleton h-10 w-2/3" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-5/6" /><div className="skeleton h-4 w-4/6" /></div></div>
      </main>
    );
  }

  return (
    <main>
      {/* Cinematic backdrop */}
      <div className="relative h-56 overflow-hidden sm:h-72">
        <img src={series.cover || series.thumbnail} alt="" aria-hidden className="h-full w-full scale-110 object-cover object-[50%_20%] opacity-60 blur-md" onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/45 to-transparent" />
        <button onClick={() => navigate(-1)} className="btn-ghost absolute left-3 top-3 rounded-xl p-2.5 sm:left-6 sm:top-5" aria-label="Go back"><ArrowLeft size={18} /></button>
      </div>

      <div className="mx-auto -mt-24 max-w-7xl px-3 sm:-mt-32 sm:px-6">
        <div className="grid gap-6 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] lg:gap-10">
          {/* Cover */}
          <div className="relative mx-auto w-44 sm:w-52 md:mx-0 md:w-full">
            <img src={series.thumbnail} alt={`${series.title} cover`} className="aspect-[2/3] w-full rounded-2xl border border-white/15 object-cover shadow-glass-lg" onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }} />
          </div>

          {/* Info */}
          <div className="min-w-0 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">{source === 'omega' ? 'OmegaScans' : source === 'allmanga' ? 'AllManga' : source === 'mangadex' ? 'MangaDex' : 'Cooren'}</span>
              <h1 className="font-display text-4xl leading-[0.95] tracking-wide text-[var(--text)] sm:text-6xl">{series.title}</h1>
            </div>
            {series.alternativeNames && <p className="mt-2 text-xs italic text-[var(--text-muted)] sm:text-sm">{series.alternativeNames}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--text-muted)] sm:text-sm">
              <span className={`chip border ${statusColor(series.status)}`}>{capitalize(series.status)}</span>
              <span className="capitalize">{series.type}</span>
              <span className="inline-flex items-center gap-1.5 text-[var(--accent)]"><Star size={14} fill="currentColor" />{series.rating || 'â€”'}</span>
              <span className="inline-flex items-center gap-1.5"><Heart size={14} />{formatCount(series.bookmarksCount)} bookmarks</span>
              {series.releaseYear && <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{series.releaseYear}</span>}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-[var(--text-muted)] sm:text-xs">
              {series.author && <span className="inline-flex items-center gap-1.5"><PenTool size={12} />{series.author}</span>}
              {series.studio && <span className="inline-flex items-center gap-1.5"><Building2 size={12} />{series.studio}</span>}
              {series.releaseSchedule?.length > 0 && <span className="inline-flex items-center gap-1.5">Updates: {series.releaseSchedule.join(', ')}</span>}
            </div>

            {series.tags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">{series.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>
            )}

            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">{series.description}</p>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {source === 'allmanga' ? (
                <a
                  href={`https://mkissa.to/manga/${series.slug}/chapter-${encodeURIComponent(continueTarget ?? firstCh)}-sub`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-accent inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold uppercase tracking-widest sm:text-base"
                >
                  {continueTarget ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  {continueTarget ? `Continue — Ch.${historyEntry?.chapterName || continueTarget} on AllManga` : 'Read on AllManga'}
                </a>
              ) : source === 'mangadex' ? (
                <Link
                  to={`/read/${series.slug}/${encodeURIComponent(continueTarget ?? firstCh)}?source=mangadex`}
                  className="btn-accent inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold uppercase tracking-widest sm:text-base"
                >
                  {continueTarget ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  {continueTarget ? 'Continue where you left off' : 'Start Reading â€” Inside OMEGA'}
                </Link>
              ) : (
              <Link to={`/read/${series.slug}/${continueTarget ?? firstCh}${source !== 'omega' ? `?source=${source}` : ''}`} className="btn-accent inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold uppercase tracking-widest sm:text-base">
                {continueTarget ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                {continueTarget ? `Continue - Ch.${historyEntry?.chapterName}` : 'Start Reading'}
              </Link>
              )}
              <button onClick={toggleBookmark} aria-pressed={bookmarked} aria-label="Bookmark series" className="btn-ghost rounded-2xl p-3.5">
                {bookmarked ? <BookmarkCheck size={20} className="text-[var(--accent)]" /> : <Bookmark size={20} />}
              </button>
              <button onClick={toggleFavorite} aria-pressed={favorited} aria-label="Favorite series" className="btn-ghost rounded-2xl p-3.5">
                <Heart size={20} className={favorited ? 'fill-[var(--danger)] text-[var(--danger)]' : ''} />
              </button>
            </div>

          </div>
        </div>

        {/* Chapter list */}
        <section className="mt-10 sm:mt-14" aria-label="Chapters">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t divider pt-6">
            <div className="flex items-center gap-3">
              <BookOpen size={18} className="text-[var(--accent)]" />
              <h2 className="font-display text-2xl tracking-wide text-[var(--text)]">CHAPTERS</h2>
              <span className="chip">{series.chaptersCount || series.chapters.length} total</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="input flex items-center gap-2 rounded-xl px-3 py-2">
                <Search size={14} className="text-[var(--text-faint)]" />
                <input value={chapterQuery} onChange={(e) => setChapterQuery(e.target.value)} placeholder="Find chapterâ€¦" aria-label="Filter chapters" className="w-24 bg-transparent text-xs text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] sm:w-32" />
              </div>
              <button onClick={() => setNewestFirst((v) => !v)} className="btn-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium" aria-label="Toggle chapter order">
                <ArrowUpDown size={14} /> {newestFirst ? 'Newest' : 'Oldest'}
              </button>
            </div>
          </div>

          {chapterList.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">No chapters match â€œ{chapterQuery}â€.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {chapterList.slice(0, visible).map((ch) => {
                const readPage = progress[ch.slug];
                const read = readPage !== undefined;
                return source === 'allmanga' ? (
                  <a
                    key={ch.slug}
                    href={`https://mkissa.to/manga/${series.slug}/chapter-${encodeURIComponent(ch.name)}-sub`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Read chapter ${ch.name} on AllManga`}
                    className="group rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
                  >
                    <span className="block text-xs font-bold text-[var(--text)]">Ch.{ch.name}</span>
                    <span className="mt-0.5 block text-[10px] text-[var(--text-faint)]">Opens on AllManga</span>
                  </a>
                ) : source === 'mangadex' ? (
                  <Link
                    key={ch.slug}
                    to={`/read/${series.slug}/${ch.slug}?source=mangadex`}
                    aria-label={`Read chapter ${ch.name}`}
                    className="group rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-white/20"
                  >
                    <span className="block text-xs font-bold text-[var(--text)]">Ch.{ch.name}</span>
                    <span className="mt-0.5 block text-[10px] text-[var(--text-faint)]">{'Inside OMEGA'}</span>
                  </Link>
                ) : (
                  <Link
                    key={ch.slug}
                    to={`/read/${series.slug}/${ch.slug}${source !== 'omega' ? `?source=${source}` : ''}`}
                    className={`group rounded-xl border px-3 py-3 transition-all hover:-translate-y-0.5 ${read ? 'border-[var(--accent)]/35 bg-[var(--accent)]/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                  >
                    <span className="block text-xs font-bold text-[var(--text)]">Ch.{ch.name}</span>
                    <span className="mt-0.5 block text-[10px] text-[var(--text-faint)]">{timeAgo(ch.createdAt)}</span>
                    {read && <span className="mt-1 block text-[9px] font-semibold uppercase tracking-wider text-[var(--accent)]">Read p{readPage + 1}</span>}
                  </Link>
                );
              })}
            </div>
          )}
          {visible < chapterList.length && (
            <div className="mt-5 text-center">
              <button onClick={() => setVisible((v) => v + PAGE)} className="btn-ghost inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium">
                Show {Math.min(PAGE, chapterList.length - visible)} more <ChevronDown size={16} />
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}