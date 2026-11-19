export function formatViews(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatCount(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '0';
  return n.toLocaleString();
}

export function timeAgo(iso: string | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function capitalize(s: string | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function statusColor(status: string | undefined): string {
  switch ((status || '').toLowerCase()) {
    case 'ongoing': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
    case 'completed': return 'text-sky-400 border-sky-400/30 bg-sky-400/10';
    case 'hiatus': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
    default: return 'text-zinc-400 border-white/10 bg-white/5';
  }
}
