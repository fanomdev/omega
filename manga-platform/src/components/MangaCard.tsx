import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Star, Bookmark, BookmarkCheck } from 'lucide-react';
import type { NormalizedSeries } from '../types';
import { formatCount, statusColor } from '../utils/format';
import { storage } from '../utils/storage';
import { useState } from 'react';
import { useToast } from '../context/ToastContext';

export default function MangaCard({ series, index = 0 }: { series: NormalizedSeries; index?: number }) {
  const { toast } = useToast();
  const source = series.source ?? 'omega';
  const [bookmarked, setBookmarked] = useState(() => storage.isBookmarked(series.slug, source));

  const toggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = storage.toggleBookmark({ slug: series.slug, source, title: series.title, thumbnail: series.thumbnail, status: series.status, rating: series.rating });
    setBookmarked(added);
    toast(added ? 'Added to your library' : 'Removed from your library', 'success');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="manga-card group"
    >
      <Link to={`/series/${series.slug}${source !== 'omega' ? `?source=${source}` : ''}`} className="block focus:outline-none" aria-label={series.title}>
        <div className="glass glass-hover relative aspect-[2/3] overflow-hidden rounded-2xl">
          <img
            src={series.thumbnail}
            alt={`${series.title} cover`}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="card-img absolute inset-0 h-full w-full object-cover"
            onError={(e) => { const img = e.target as HTMLImageElement; img.onerror = null; img.src = '/logo.svg'; }}
          />
          <div className="card-overlay absolute inset-0" />
          {/* source badge */}
          <div className="absolute left-2.5 top-11 sm:top-12">
            <span className="chip border-white/10 bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-300 backdrop-blur-md">
              {source === 'omega' ? 'OmegaScans' : source === 'allmanga' ? 'AllManga' : source === 'mangadex' ? 'MangaDex' : 'Cooren'}
            </span>
          </div>

          {/* top row badges */}
          <div className="absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between gap-2">
            <span className={`chip border ${statusColor(series.status)} backdrop-blur-md`}>{series.status || 'unknown'}</span>
            <button
              onClick={toggleBookmark}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/45 text-zinc-200 backdrop-blur-md transition hover:scale-110 hover:text-[var(--accent)]"
            >
              {bookmarked ? <BookmarkCheck size={16} className="text-[var(--accent)]" /> : <Bookmark size={16} />}
            </button>
          </div>
          {/* bottom info */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-50 drop-shadow">{series.title}</h3>
            <div className="mt-1.5 flex items-center gap-3 text-[11px] font-medium text-zinc-300">
              <span className="inline-flex items-center gap-1 text-[var(--accent)]"><Star size={11} fill="currentColor" />{series.rating || 'â€”'}</span>
              <span className="inline-flex items-center gap-1"><Eye size={11} />{formatCount(series.totalViews)}</span>
              {series.chaptersCount > 0 && <span className="hidden xs:inline">{series.chaptersCount} ch</span>}
            </div>
          </div>
        </div>
        <div className="mt-2 hidden justify-center sm:flex">
          <span className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent-ink)] opacity-0 shadow-lg transition-all duration-300 group-hover:opacity-100">Read Now</span>
        </div>
      </Link>
    </motion.div>
  );
}
