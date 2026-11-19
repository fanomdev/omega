import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Heart, History, Trash2, Library as LibraryIcon } from 'lucide-react';
import { storage } from '../utils/storage';
import { EmptyState } from '../components/common';
import { useToast } from '../context/ToastContext';

type Tab = 'bookmarks' | 'favorites' | 'history';

export default function Library() {
  const [tab, setTab] = useState<Tab>('bookmarks');
  const [bookmarks] = useState(() => storage.bookmarks());
  const [favorites] = useState(() => storage.favorites());
  const [history, setHistory] = useState(() => storage.history());
  const { toast } = useToast();
  const navigate = useNavigate();

  const tabs = useMemo(() => ([
    { id: 'bookmarks' as Tab, label: 'Bookmarks', icon: Bookmark, count: bookmarks.length },
    { id: 'favorites' as Tab, label: 'Favorites', icon: Heart, count: favorites.length },
    { id: 'history' as Tab, label: 'History', icon: History, count: history.length },
  ]), [bookmarks.length, favorites.length, history.length]);

  const clearHistory = () => { storage.clearHistory(); setHistory([]); toast('Reading history cleared', 'success'); };

  return (
    <main className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/15"><LibraryIcon size={22} className="text-[var(--accent)]" /></span>
        <div>
          <h1 className="font-display text-4xl tracking-wide text-[var(--text)] sm:text-5xl">MY LIBRARY</h1>
          <p className="text-xs text-[var(--text-muted)] sm:text-sm">Everything you’re reading, saved on this device</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button key={id} onClick={() => setTab(id)} className={`chip ${tab === id ? 'chip-active' : ''}`}>
            <Icon size={13} /> {label} <span className="opacity-70">{count}</span>
          </button>
        ))}
        {tab === 'history' && history.length > 0 && (
          <button onClick={clearHistory} className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--danger)]"><Trash2 size={13} /> Clear history</button>
        )}
      </div>

      <div className="mt-6">
        {tab !== 'history' && (() => {
          const list = tab === 'bookmarks' ? bookmarks : favorites;
          if (list.length === 0) return <EmptyState title={tab === 'bookmarks' ? 'No bookmarks yet' : 'No favorites yet'} hint="Tap the bookmark icon on any cover or series page to save it here." />;
          return (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {list.map((b) => (
                <Link key={`${b.source ?? 'omega'}-${b.slug}`} to={`/series/${b.slug}${b.source && b.source !== 'omega' ? `?source=${b.source}` : ''}`} className="glass glass-hover group overflow-hidden rounded-2xl">
                  <img src={b.thumbnail} alt={b.title} loading="lazy" className="aspect-[2/3] w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }} />
                  <div className="p-2.5">
                    <p className="line-clamp-1 text-xs font-semibold text-[var(--text)]">{b.title}</p>
                    <p className="mt-0.5 text-[10px] capitalize text-[var(--text-muted)]">★ {b.rating} · {b.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          );
        })()}

        {tab === 'history' && (history.length === 0
          ? <EmptyState title="Nothing read yet" hint="Open any chapter and your progress will appear here." />
          : <div className="grid gap-2">
              {history.map((h) => (
                <button key={`${h.source ?? 'omega'}-${h.slug}-${h.chapter}`} onClick={() => navigate(`/read/${h.slug}/${h.chapter}${h.source && h.source !== 'omega' ? `?source=${h.source}` : ''}`)} className="glass group flex items-center gap-4 rounded-2xl p-3 text-left transition hover:border-[var(--glass-border-strong)]">
                  <img src={h.thumbnail} alt="" loading="lazy" className="h-20 w-14 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--text)]">{h.title}</span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">Chapter {h.chapterName} · page {h.page + 1}{h.pageCount ? ` of ${h.pageCount}` : ''}</span>
                    <span className="mt-0.5 block text-[10px] text-[var(--text-faint)]">{new Date(h.updatedAt).toLocaleString()}</span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-ink)]">Resume</span>
                </button>
              ))}
            </div>
        )}
      </div>
    </main>
  );
}
