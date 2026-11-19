import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Compass, Clock, Shuffle, Library, Heart, Search, Sun, Moon, Menu, X, SearchIcon, Loader2 } from 'lucide-react';
import { service, USE_MOCKS } from '../services';
import { useDebounce } from '../hooks/useDebounce';
import { storage } from '../utils/storage';
import { useToast } from '../context/ToastContext';
import type { NormalizedSeries } from '../types';

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/latest', label: 'Latest', icon: Clock },
  { to: '/random', label: 'Random', icon: Shuffle },
  { to: '/yaoi', label: 'Yaoi & Yuri', icon: Heart },
  { to: '/library', label: 'Library', icon: Library },
];

function Logo() {
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-2.5" aria-label="OMEGA home">
      <img src="/logo.svg" alt="" width={34} height={34} className="transition-transform duration-300 group-hover:rotate-3" />
      <span className="font-display text-[26px] leading-none tracking-[0.18em] text-[var(--text)]">
        OME<span className="text-[var(--accent)]">G</span>A
      </span>
    </Link>
  );
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<NormalizedSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(q, 350);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => { if (open) { setQ(''); setResults([]); setTimeout(() => inputRef.current?.focus(), 40); } }, [open]);
  useEffect(() => {
    if (!debounced.trim()) { setResults([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    service.search(debounced.trim(), 1)
      .then((r) => { if (!cancelled) setResults(r.data.slice(0, 6)); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = () => { if (q.trim()) { navigate(`/explore?q=${encodeURIComponent(q.trim())}`); onClose(); } };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 pt-24 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} role="dialog" aria-modal="true" aria-label="Search manga"
        >
          <motion.div
            className="glass-strong w-full max-w-2xl overflow-hidden rounded-2xl"
            initial={{ y: -16, opacity: 0, scale: .98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-center gap-3 border-b divider border-b px-5 py-4">
              <SearchIcon size={20} className="text-[var(--accent)]" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search manga, manhwa, manhua…"
                className="w-full bg-transparent text-lg text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
                aria-label="Search query"
              />
              {loading && <Loader2 size={18} className="animate-spin text-[var(--text-muted)]" />}
              {q && <button type="button" onClick={() => setQ('')} aria-label="Clear"><X size={18} className="text-[var(--text-muted)] hover:text-[var(--text)]" /></button>}
              <kbd className="chip hidden sm:inline-flex">ESC</kbd>
            </form>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {results.length === 0 && !loading && q.trim() && (
                <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No results for “{q.trim()}”</p>
              )}
              {results.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => { navigate(`/series/${s.slug}`); onClose(); }}
                  className="flex w-full items-center gap-4 rounded-xl p-2 text-left transition hover:bg-white/5"
                >
                  <img src={s.thumbnail} alt="" className="h-16 w-11 rounded-md object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--text)]">{s.title}</span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{s.type} · {s.status} · ★ {s.rating}</span>
                  </span>
                </button>
              ))}
              {q.trim() && (
                <button onClick={submit} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-medium text-[var(--accent)] transition hover:bg-white/10">
                  See all results for “{q.trim()}” →
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Navbar({ theme, onToggleTheme }: { theme: 'dark' | 'light'; onToggleTheme: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [ageAck, setAgeAck] = useState(() => storage.ageAck());
  const { toast } = useToast();
  const location = useLocation();

  const toggleAge = () => {
    const next = !storage.ageAck();
    if (next) storage.saveAgeAck(); else storage.clearAgeAck();
    setAgeAck(next);
    toast(next ? '18+ mode enabled — mature catalog unlocked' : '18+ mode disabled — back to SFW view', 'success');
    window.setTimeout(() => window.location.reload(), 900);
  };

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey || e.key === '/') && (e.key === 'k' || e.key === '/') && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault(); setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'pt-2' : 'pt-4'}`}
      >
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-6">
          <nav className={`glass flex h-14 items-center gap-2 rounded-2xl px-3 transition-all duration-500 sm:h-16 sm:gap-4 sm:px-5 ${scrolled ? 'shadow-glass-lg' : ''}`} aria-label="Main navigation">
            <Logo />
            <div className="mx-1 hidden h-6 w-px bg-white/10 md:block" />
            <div className="hidden items-center gap-1 md:flex">
              {links.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `relative rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${isActive ? 'text-[var(--accent-ink)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-[var(--accent)]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                      <span className="relative">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {USE_MOCKS && <span className="chip hidden border-amber-400/30 text-amber-400 lg:inline-flex" title="VITE_USE_MOCKS=true — showing offline demo data">DEMO DATA</span>}
              <button
                onClick={toggleAge}
                aria-pressed={ageAck}
                title={ageAck ? '18+ mode is ON' : 'Enable 18+ mode'}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${ageAck ? 'border-amber-400/50 bg-amber-400/15 text-amber-400' : 'border-white/10 bg-white/5 text-zinc-400 hover:border-amber-400/40 hover:text-amber-300'}`}
              >
                18+
              </button>
              <button onClick={() => setSearchOpen(true)} aria-label="Open search" className="rounded-xl p-2.5 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text)]">
                <Search size={19} />
              </button>
              <button onClick={onToggleTheme} aria-label="Toggle theme" className="rounded-xl p-2.5 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text)]">
                {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
              </button>
              <button onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={menuOpen} className="rounded-xl p-2.5 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text)] md:hidden">
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </nav>
          {/* Mobile menu */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="glass-strong mt-2 overflow-hidden rounded-2xl p-2 md:hidden"
              >
                {links.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${isActive ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
                  >
                    <Icon size={18} /> {label}
                  </NavLink>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      {/* spacer for fixed navbar */}
      <div aria-hidden className="h-16 sm:h-20" />
    </>
  );
}
