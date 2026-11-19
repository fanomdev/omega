import { useCallback, useEffect, useState } from 'react';
import { service } from '../services';
import type { NormalizedSeries } from '../types';
import { GridSkeleton, SeriesGrid, ErrorState, SectionHeader } from '../components/common';
import { Shuffle } from 'lucide-react';

export default function Random() {
  const [items, setItems] = useState<NormalizedSeries[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shuffle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await service.random(6);
      setItems(Array.isArray(res.data) ? res.data : [res.data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch random series.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { shuffle(); }, [shuffle]);

  return (
    <main className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-12">
      <SectionHeader
        title="RANDOM DISCOVERY"
        subtitle="Six surprises from the archive — deal yourself another hand"
        action={
          <button onClick={shuffle} disabled={loading} className="btn-accent inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-60">
            <Shuffle size={16} className={loading ? 'animate-spin' : ''} /> Shuffle
          </button>
        }
      />
      {error ? <ErrorState message={error} onRetry={shuffle} />
        : loading && !items ? <GridSkeleton count={6} />
        : items ? <SeriesGrid series={items} />
        : null}
    </main>
  );
}
