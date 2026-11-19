import { Link } from 'react-router-dom';
import { Ghost } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <Ghost size={48} strokeWidth={1.4} className="text-[var(--text-faint)]" />
      <p className="font-display text-6xl tracking-widest text-[var(--text)]">404</p>
      <p className="text-sm text-[var(--text-muted)]">This page wandered off the panel.</p>
      <Link to="/" className="btn-accent mt-2 rounded-2xl px-6 py-3 text-xs font-bold uppercase tracking-widest">Back to Home</Link>
    </main>
  );
}
