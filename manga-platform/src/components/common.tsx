import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Inbox } from 'lucide-react';
import type { NormalizedSeries } from '../types';
import MangaCard from './MangaCard';

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
      <div>
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-[var(--accent)]" aria-hidden />
          <h2 className="font-display text-2xl tracking-wide text-[var(--text)] sm:text-3xl">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 pl-4 text-xs text-[var(--text-muted)] sm:text-sm">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="skeleton aspect-[2/3] w-full !rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-3 w-2/5" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function SeriesGrid({ series }: { series: NormalizedSeries[] }) {
  return (
    <div className="manga-grid grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {series.map((s, i) => <MangaCard key={s.slug} series={s} index={i} />)}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center">
      <AlertTriangle className="text-[var(--accent)]" size={36} />
      <p className="font-semibold text-[var(--text)]">Couldn’t reach the API</p>
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-2 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium">
          <RefreshCw size={15} /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
      <Inbox className="text-[var(--text-faint)]" size={40} strokeWidth={1.5} />
      <p className="font-semibold text-[var(--text)]">{title}</p>
      {hint && <p className="text-sm text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
