import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Sparkles, Shuffle, ArrowRight, BookOpenCheck, Trash2, ChevronRight } from 'lucide-react';
import { service } from '../services';
import type { NormalizedSeries } from '../types';
import { storage } from '../utils/storage';
import HeroSection from '../components/HeroSection';
import MangaCard from '../components/MangaCard';
import { SectionHeader, GridSkeleton, SeriesGrid, ErrorState } from '../components/common';

export default function Home() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<NormalizedSeries | null>(null);
  const [trending, setTrending] = useState<NormalizedSeries[] | null>(null);
  const [latest, setLatest] = useState<NormalizedSeries[] | null>(null);
  const [randomPick, setRandomPick] = useState<NormalizedSeries | null>(null);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [history, setHistory] = useState(() => storage.history());

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.allSettled([
      service.seriesList({ sortBy: 'rating', perPage: 1 }),
      service.seriesList({ sortBy: 'views', perPage: 12 }),
      service.seriesList({ sortBy: 'updated', perPage: 12 }),
    ]).then(([feat, trend, lat]) => {
      if (cancelled) return;
      if (feat.status === 'fulfilled' && feat.value.data[0]) setFeatured(feat.value.data[0]);
      if (trend.status === 'fulfilled') setTrending(trend.value.data);
      if (lat.status === 'fulfilled') setLatest(lat.value.data);
      if (feat.status !== 'fulfilled' || !feat.value.data[0]) {
        const fallback = (trend.status === 'fulfilled' && trend.value.data[0]) || (lat.status === 'fulfilled' && lat.value.data[0]);
        if (fallback) setFeatured(fallback);
      }
      const failed = [feat, trend, lat].filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      if (failed.length === 3) setError(failed[0].reason?.message || 'Failed to load manga.');
    });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const shuffle = useCallback(async () => {
    setLoadingRandom(true);
    try {
      const r = await service.random(1);
      setRandomPick(Array.isArray(r.data) ? r.data[0] : r.data);
    } catch {
      /* keep previous pick */
    } finally {
      setLoadingRandom(false);
    }
  }, []);

  useEffect(() => { shuffle(); }, [shuffle, reloadKey]);

  const clearHistory = () => { storage.clearHistory(); setHistory([]); };

  // History entries saved before the API carried titles/covers have blanks — backfill from series()
  useEffect(() => {
    const missing = storage.history().filter((h) => !h.title || !h.thumbnail);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.allSettled(missing.map((h) => service.series(h.slug, h.source).then((r) => ({ h, s: r?.data })))).then((results) => {
      if (cancelled) return;
      let refreshed = false;
      for (const res of results) {
        if (res.status !== 'fulfilled') continue;
        const { h, s } = res.value;
        if (!s) continue;
        storage.saveToHistory({ ...h, title: h.title || s.title, thumbnail: h.thumbnail || (s.thumbnail || s.cover || '') });
        refreshed = true;
      }
      if (refreshed) setHistory(storage.history());
    });
    return () => { cancelled = true; };
  }, []);

  if (error && !featured && !trending) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16">
        <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      </main>
    );
  }

  return (
    <main>
      {/* HERO */}
      {featured ? <HeroSection series={featured} /> : (
        <div className="mx-auto max-w-7xl px-4"><div className="skeleton h-[70vh] min-h-[420px] w-full rounded-[2rem]" /></div>
      )}

      <div className="mx-auto max-w-7xl space-y-12 px-3 py-10 sm:space-y-16 sm:px-6 sm:py-14">
        {/* CONTINUE READING */}
        {history.length > 0 && (
          <section aria-label="Continue reading">
            <SectionHeader
              title="Continue Reading"
              subtitle="Pick up right where you left off"
              action={
                <button onClick={clearHistory} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--danger)]">
                  <Trash2 size={13} /> Clear
                </button>
              }
            />
            <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-2 sm:-mx-6 sm:px-6">
              {history.slice(0, 10).map((h) => {
                const pct = h.pageCount > 0 ? Math.round(((h.page + 1) / h.pageCount) * 100) : 0;
                return (
                  <button
                    key={`${h.slug}-${h.chapter}`}
                    onClick={() => navigate(`/read/${h.slug}/${h.chapter}?source=${h.source}`)}
                    className="glass glass-hover group w-36 shrink-0 overflow-hidden rounded-2xl text-left sm:w-44"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img src={h.thumbnail} alt="" loading="lazy" className="card-img h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="line-clamp-1 text-xs font-semibold text-zinc-100">{h.title}</p>
                        <p className="text-[10px] text-zinc-400">Ch.{h.chapterName} · {pct}% read</p>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} /></div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* TRENDING / POPULAR */}
        <section aria-label="Trending manga">
          <SectionHeader
            title="Trending Now"
            subtitle="The most-read series across the archive"
            action={<Link to="/explore?sort=views" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline">View all <ChevronRight size={14} /></Link>}
          />
          {trending ? <SeriesGrid series={trending} /> : <GridSkeleton count={12} />}
        </section>

        {/* RANDOM DISCOVERY */}
        <section aria-label="Random discovery" className="relative overflow-hidden rounded-3xl">
          <div className="glass-strong relative rounded-3xl p-5 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--glow-b)] blur-3xl" />
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
              <div className="relative h-48 w-32 shrink-0 sm:h-64 sm:w-44">
                <AnimatePresence mode="wait" initial={false}>
                  {randomPick && (
                    <motion.img
                      key={randomPick.slug}
                      src={randomPick.thumbnail}
                      alt={`${randomPick.title} cover`}
                      initial={{ opacity: 0, rotateY: 70, scale: 0.8 }}
                      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                      exit={{ opacity: 0, rotateY: -55, scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                      className="absolute inset-0 h-full w-full rounded-xl border border-white/15 object-cover shadow-glass-lg"
                    />
                  )}
                </AnimatePresence>
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Sparkles size={16} className="text-[var(--accent)]" />
                  <h2 className="font-display text-3xl tracking-wide text-[var(--text)]">Feeling Lucky?</h2>
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">A random pick from a catalogue of hundreds of series.</p>
                <AnimatePresence mode="wait">
                  {randomPick && (
                    <motion.div key={randomPick.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="mt-3">
                      <p className="line-clamp-1 text-lg font-bold text-[var(--text)] sm:text-xl">{randomPick.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">{randomPick.type} · {randomPick.status} · ★ {randomPick.rating}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  <button onClick={shuffle} disabled={loadingRandom} className="btn-accent inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-60">
                    <Shuffle size={16} className={loadingRandom ? 'animate-spin' : ''} /> Shuffle
                  </button>
                  {randomPick && (
                    <Link to={`/series/${randomPick.slug}`} className="btn-ghost inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-semibold uppercase tracking-widest">
                      View Series <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LATEST UPDATES */}
        <section aria-label="Latest updates">
          <SectionHeader
            title="Latest Updates"
            subtitle="Recently updated series straight from the archive"
            action={<Link to="/latest" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline">View all <ChevronRight size={14} /></Link>}
          />
          {latest ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {latest.slice(0, 6).map((s, i) => <MangaCard key={s.slug} series={s} index={i} />)}
            </div>
          ) : <GridSkeleton count={6} />}
        </section>

        {/* trending secondary: ongoing */}
        <section className="pb-4 text-center">
          <Link to="/explore" className="inline-flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] bg-white/5 px-8 py-4 font-display text-xl tracking-widest text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
            <BookOpenCheck size={20} /> BROWSE EVERYTHING <Flame size={18} className="text-[var(--accent)]" />
          </Link>
        </section>
      </div>
    </main>
  );
}
