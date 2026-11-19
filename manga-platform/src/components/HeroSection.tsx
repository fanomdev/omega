import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, Info, Star, Eye, Users, CalendarDays, BookOpen } from 'lucide-react';
import type { NormalizedSeries } from '../types';
import { formatCount, capitalize, statusColor } from '../utils/format';
import { storage } from '../utils/storage';

export function firstChapterSlug(s: NormalizedSeries): string {
  const chapters = [...(s.chapters ?? [])];
  if (chapters.length > 0) {
    const parsed = chapters
      .map((c) => ({ slug: c.slug, n: Number(/(\d+)\s*$/.exec(c.name)?.[1] ?? /(\d+)$/.exec(c.slug)?.[1] ?? NaN) }))
      .filter((c) => Number.isFinite(c.n))
      .sort((a, b) => a.n - b.n);
    if (parsed.length > 0) return parsed[0].slug;
  }
  return 'chapter-1';
}

export default function HeroSection({ series }: { series: NormalizedSeries }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  // Every source here serves page images, so Read Now always opens the in-app reader.
  const history = storage.history().find((h) => h.slug === series.slug && h.source === (series.source ?? 'omega'));
  const firstCh = firstChapterSlug(series);
  const detailHref = `/series/${series.slug}${series.source && series.source !== 'omega' ? `?source=${series.source}` : ''}`;
  const description = series.description?.length > 220 ? `${series.description.slice(0, 220).trimEnd()}â€¦` : series.description;

  return (
    <section className="relative overflow-hidden rounded-none sm:rounded-[2rem] sm:border sm:border-white/10" aria-label={`Featured: ${series.title}`}>
      {/* backdrop artwork */}
      <div className="absolute inset-0">
        <motion.img
          key={series.slug}
          src={series.cover || series.thumbnail}
          alt=""
          aria-hidden
          initial={reduce ? false : { scale: 1.12, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="h-full w-full object-cover object-[68%_18%]"
          onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070d] via-[#05070d]/75 to-transparent dark:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070d] via-[#05070d]/25 to-transparent" />
        <div className="absolute inset-0 bg-[#05070d]/15" />
      </div>

      <div className="relative mx-auto flex min-h-[74vh] max-w-7xl flex-col justify-end px-4 pb-10 pt-32 sm:min-h-[78vh] sm:justify-center sm:px-10 sm:pb-16 sm:pt-28 lg:px-14">
        <motion.div
          key={series.slug + '-content'}
          initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } } }}
          className="max-w-xl"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0 } }} className="flex flex-wrap items-center gap-2">
            <span className="chip border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]">FEATURED</span>
            <span className={`chip border ${statusColor(series.status)}`}>{capitalize(series.status)}</span>
            <span className="chip capitalize">{series.type}</span>
            {series.badge && <span className="chip border-red-400/40 bg-red-500/15 text-red-300">{series.badge}</span>}
          </motion.div>

          <motion.h1 variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0 } }} className="mt-4 font-display text-5xl leading-[0.95] tracking-wide text-zinc-50 sm:text-7xl">
            {series.title}
          </motion.h1>

          <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="mt-3 flex items-center gap-4 text-xs font-medium text-zinc-300 sm:text-sm">
            <span className="inline-flex items-center gap-1.5 text-[var(--accent)]"><Star size={14} fill="currentColor" />{series.rating || 'â€”'}</span>
            <span className="inline-flex items-center gap-1.5"><Eye size={14} />{formatCount(series.totalViews)}</span>
            <span className="inline-flex items-center gap-1.5 lg:hidden xl:inline-flex"><Users size={14} />Source: {series.source === 'cooren' ? 'Cooren' : series.source === 'allmanga' ? 'AllManga' : series.source === 'mangadex' ? 'MangaDex' : 'OmegaScans'}</span>
            {series.releaseYear && <span className="hidden items-center gap-1.5 sm:inline-flex"><CalendarDays size={14} />{series.releaseYear}</span>}
            {series.chaptersCount > 0 && <span className="hidden items-center gap-1.5 lg:inline-flex"><BookOpen size={14} />{series.chaptersCount} chapters</span>}
          </motion.div>

          <motion.p variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} className="mt-4 line-clamp-3 max-w-lg text-sm leading-relaxed text-zinc-300 sm:text-base">
            {description}
          </motion.p>

          {series.tags?.length > 0 && (
            <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="mt-4 hidden flex-wrap gap-2 sm:flex">
              {series.tags.slice(0, 4).map((t) => <span key={t} className="chip">{t}</span>)}
            </motion.div>
          )}

          <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={() => navigate(`/read/${series.slug}/${firstCh}${series.source && series.source !== 'omega' ? `?source=${series.source}` : ''}`)} className="btn-accent inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm uppercase tracking-widest sm:text-base">
              <Play size={18} fill="currentColor" /> Read Now
            </button>
            <Link to={detailHref} className="btn-ghost inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold sm:text-base">
              <Info size={18} /> View Details
            </Link>
            {history && (
              <button onClick={() => navigate(`/read/${series.slug}/${history.chapter}${series.source && series.source !== 'omega' ? `?source=${series.source}` : ''}`)} className="text-xs font-medium text-zinc-300 underline decoration-[var(--accent)]/60 underline-offset-4 transition hover:text-[var(--accent)]">
                Continue ch.{history.chapterName} â†’
              </button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
