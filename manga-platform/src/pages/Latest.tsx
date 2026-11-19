import { useEffect, useState } from 'react';
import { service } from '../services';
import type { NormalizedSeries } from '../types';
import { SectionHeader, SeriesGrid, GridSkeleton, ErrorState } from '../components/common';

export default function Latest() {
  const [data, setData] = useState<NormalizedSeries[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    service.seriesList({ sortBy: 'updated', perPage: 30 })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load updates.'); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  return (
    <main className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-12">
      <SectionHeader title="LATEST UPDATES" subtitle="Recently updated series merged across both catalogues" />
      {error ? <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        : data ? <SeriesGrid series={data} />
        : <GridSkeleton count={12} />}
    </main>
  );
}
