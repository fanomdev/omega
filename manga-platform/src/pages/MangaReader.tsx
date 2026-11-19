import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Maximize, Minimize, Settings, X,
  Rows3, File, Columns2, ArrowRightLeft, List, Check, ImageOff, RotateCw,
} from 'lucide-react';
import { useReader } from '../hooks/useReader';
import { storage } from '../utils/storage';
import { useToast } from '../context/ToastContext';

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || (t instanceof HTMLElement && t.isContentEditable);

const PageImage = memo(function PageImage({ src, index, onError, onLoad, error, onRetry }: {
  src: string; index: number; onLoad: (i: number) => void; onError: (i: number) => void; error: boolean; onRetry: (i: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  // transient at-home CDN flakes: auto-retry with a cache-busted URL up to twice before showing failure
  const [attempt, setAttempt] = useState(0);
  const [permanent, setPermanent] = useState(false);
  useEffect(() => { if (!permanent && error) setPermanent(true); }, [error, permanent]);
  useEffect(() => { if (!error) { setPermanent(false); setAttempt(0); setLoaded(false); } }, [error]);

  if (permanent || error) {
    return (
      <div id={`reader-page-${index}`} data-page-index={index} className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 text-zinc-500">
        <ImageOff size={32} />
        <p className="text-xs">Page {index + 1} failed to load</p>
        <button onClick={() => { setPermanent(false); setAttempt(0); onRetry(index); }} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:text-zinc-200"><RotateCw size={12} /> Retry</button>
      </div>
    );
  }

  const bustSrc = attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}`;
  return (
    <div id={`reader-page-${index}`} data-page-index={index} className="relative w-full overflow-hidden bg-black/20">
      {!loaded && <div className="skeleton aspect-[3/4] w-full !rounded-none" aria-hidden />}
      <img
        key={`${attempt}:${loaded ? 'loaded' : 'pending'}`}
        src={bustSrc}
        alt={`Page ${index + 1}`}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={`page-img block w-full select-none ${loaded ? 'opacity-100' : 'absolute inset-0 opacity-0'}`}
        onLoad={() => { setLoaded(true); onLoad(index); }}
        onError={() => { if (attempt < 2) setAttempt((a) => a + 1); else { setPermanent(true); onError(index); } }}
      />
    </div>
  );
});

export default function MangaReader() {
  const { slug, chapter } = useParams<{ slug: string; chapter: string }>();
  const [searchParams] = useSearchParams();
  const source = (searchParams.get('source') === 'cooren' ? 'cooren' : searchParams.get('source') === 'allmanga' ? 'allmanga' :  searchParams.get('source') === 'mangadex' ? 'mangadex' : 'omega') as 'omega' | 'cooren' | 'allmanga' | 'mangadex';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { prefs, updatePrefs, content, nav, seriesTitle, loading, error, page, setPage, retry } = useReader(slug, chapter, source);

  const [chrome, setChrome] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [chapterFilter, setChapterFilter] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [failedPages, setFailedPages] = useState<Set<number>>(new Set());
  const [chapterFlash, setChapterFlash] = useState<string | null>(null);
  const [scrollFrac, setScrollFrac] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number | undefined>(undefined);
  const restoredFor = useRef<string>('');
  const listRef = useRef<HTMLDivElement>(null);

  const pageCount = content?.pageCount ?? 0;
  const step = prefs.mode === 'double' ? 2 : 1;
  const isRTL = prefs.direction === 'rtl';

  // ---- chrome auto-hide ----
  const pokeChrome = useCallback(() => {
    setChrome(true);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setChrome(false), 3200);
  }, []);
  useEffect(() => {
    pokeChrome();
    window.addEventListener('mousemove', pokeChrome, { passive: true });
    window.addEventListener('touchstart', pokeChrome, { passive: true });
    return () => {
      window.removeEventListener('mousemove', pokeChrome);
      window.removeEventListener('touchstart', pokeChrome);
      window.clearTimeout(idleTimer.current);
    };
  }, [pokeChrome]);

  // ---- fullscreen sync ----
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { toast('Fullscreen is not available here', 'error'); }
  }, [toast]);

  // ---- chapter flash on change ----
  useEffect(() => {
    if (!content) return;
    restoredFor.current = ''; // allow scroll restore for the new chapter
    setChapterFlash(content.name);
    const t = window.setTimeout(() => setChapterFlash(null), 1300);
    setFailedPages(new Set());
    setSettingsOpen(false);
    setChapterOpen(false);
    return () => window.clearTimeout(t);
  }, [content?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- restore reading position (once per chapter) ----
  useLayoutEffect(() => {
    if (!content) return;
    const key = `${slug}/${chapter}`;
    if (restoredFor.current === key) return;
    restoredFor.current = key;
    if (prefs.mode === 'vertical') {
      const t = window.setTimeout(() => { document.getElementById(`reader-page-${page}`)?.scrollIntoView({ block: 'start' }); }, 120);
      return () => window.clearTimeout(t);
    }
    // paged: page state already restored by useReader
  }, [content, page, prefs.mode, slug, chapter]);

  // ---- vertical: track visible page + scroll fraction ----
  useEffect(() => {
    if (prefs.mode !== 'vertical' || !content) return;
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.pageIndex);
            if (Number.isFinite(idx)) setPage(idx);
          }
        }
      },
      { root, rootMargin: '-42% 0px -42% 0px', threshold: 0 },
    );
    root.querySelectorAll('[data-page-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [prefs.mode, content, setPage]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setScrollFrac(max > 0 ? el.scrollTop / max : 1);
  };

  // ---- navigation ----
  const goToChapter = useCallback((ch: { slug: string }) => {
    navigate(`/read/${slug}/${ch.slug}`);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [navigate, slug]);

  const nextChapter = nav?.next ?? null;
  const prevChapter = nav?.prev ?? null;

  const nextPage = useCallback(() => {
    if (!content) return;
    if (page + step < pageCount) setPage((p) => Math.min(p + step, pageCount - 1));
    else if (nextChapter) { toast(`Chapter ${nextChapter.name}`, 'success'); goToChapter(nextChapter); }
    else toast('YouÃ¢â‚¬â„¢re at the latest chapter', 'info');
  }, [content, page, step, pageCount, nextChapter, toast, goToChapter, setPage]);

  const prevPage = useCallback(() => {
    if (page - step >= 0) setPage((p) => Math.max(0, p - step));
    else if (prevChapter) { toast(`Chapter ${prevChapter.name}`, 'info'); goToChapter(prevChapter); }
  }, [page, step, prevChapter, goToChapter, toast, setPage]);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const key = e.key;
      if (key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false);
        else if (chapterOpen) setChapterOpen(false);
        else navigate(`/series/${slug}`);
        return;
      }
      switch (key.toLowerCase()) {
        case 'f': e.preventDefault(); toggleFullscreen(); return;
        case 'arrowright': {
          e.preventDefault();
          if (prefs.mode === 'vertical') { if (nextChapter) goToChapter(nextChapter); else toast('No next chapter', 'info'); }
          else if (isRTL) prevPage();
          else nextPage();
          return;
        }
        case 'arrowleft': {
          e.preventDefault();
          if (prefs.mode === 'vertical') { if (prevChapter) goToChapter(prevChapter); else toast('This is the first chapter', 'info'); }
          else if (isRTL) nextPage();
          else prevPage();
          return;
        }
        case 'arrowdown':
          if (prefs.mode === 'vertical') { e.preventDefault(); scrollRef.current?.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' }); }
          return;
        case 'arrowup':
          if (prefs.mode === 'vertical') { e.preventDefault(); scrollRef.current?.scrollBy({ top: -window.innerHeight * 0.85, behavior: 'smooth' }); }
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, chapterOpen, navigate, slug, prefs.mode, isRTL, nextPage, prevPage, nextChapter, prevChapter, goToChapter, toggleFullscreen, toast]);

  // ---- chapter filter list ----
  const filteredChapters = useMemo(() => {
    const list = nav?.chapters ?? [];
    const q = chapterFilter.trim().toLowerCase();
    return q ? list.filter((c) => c.name.toLowerCase().includes(q) || (c.title ?? '').toLowerCase().includes(q)) : list;
  }, [nav, chapterFilter]);

  useEffect(() => {
    if (chapterOpen) listRef.current?.querySelector('[data-current="true"]')?.scrollIntoView({ block: 'center' });
  }, [chapterOpen]);

  const pair = prefs.mode === 'double'
    ? (isRTL ? [Math.min(page + 1, pageCount - 1), page] : [page, Math.min(page + 1, pageCount - 1)]).filter((v, i, a) => a.indexOf(v) === i)
    : [page];

  const progress = prefs.mode === 'vertical'
    ? scrollFrac
    : pageCount > 0 ? Math.min(1, (page + (prefs.mode === 'double' ? 2 : 1)) / pageCount) : 0;

  const retryPage = (i: number) => setFailedPages((s) => { const n = new Set(s); n.delete(i); return n; });

  // ================= render =================

  if (error) {
    return (
      <div className="reader-surface flex h-[100dvh] flex-col items-center justify-center gap-4 bg-[#050505] px-6 text-center text-zinc-300" data-reader-bg="black">
        <ImageOff size={40} className="text-zinc-600" />
        <p className="text-sm max-w-md">{error}</p>
        <div className="flex gap-3">
          <button onClick={retry} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10"><RotateCw size={15} /> Retry</button>
          <Link to={`/series/${slug}`} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10"><ArrowLeft size={15} /> Back to series</Link>
        </div>
      </div>
    );
  }

  return (
    <div data-reader-bg={prefs.background} className="reader-surface fixed inset-0 z-[80] select-none overflow-hidden">
      {/* ===== content ===== */}
      {loading || !content ? (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="skeleton h-[70vh] w-full max-w-md !rounded-none opacity-60" />
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Loading chapterÃ¢â‚¬Â¦</p>
        </div>
      ) : prefs.mode === 'vertical' ? (
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="mx-auto flex flex-col" style={{ width: `min(${prefs.imageScale}%, 1080px)`, gap: `${prefs.spacing * 44}px` }}>
            <div className="h-6" aria-hidden />
            {content.images.map((src, i) => (
              <PageImage
                key={`${content.url}-${i}`}
                src={src}
                index={i}
                error={failedPages.has(i)}
                onRetry={retryPage}
                onLoad={() => {}}
                onError={(idx) => setFailedPages((s) => new Set(s).add(idx))}
              />
            ))}
            <div className="flex flex-col items-center gap-4 border-t border-white/10 py-10 text-center">
              <p className="font-display text-xl tracking-widest text-zinc-500">END OF CHAPTER {content.name}</p>
              <div className="flex gap-3">
                {prevChapter && <button onClick={() => goToChapter(prevChapter)} className="btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"><ChevronLeft size={16} /> Ch.{prevChapter.name}</button>}
                {nextChapter && <button onClick={() => goToChapter(nextChapter)} className="btn-accent inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">Ch.{nextChapter.name} <ChevronRight size={16} /></button>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full items-center justify-center">
          {/* tap zones */}
          <button aria-label={isRTL ? 'Next page' : 'Previous page'} onClick={() => (isRTL ? nextPage() : prevPage())} className="absolute inset-y-0 left-0 z-10 w-[35%] cursor-w-resize touch-manipulation" />
          <button aria-label="Toggle reader controls" onClick={() => setChrome((v) => !v)} className="absolute inset-y-0 left-[35%] z-10 w-[30%] touch-manipulation" />
          <button aria-label={isRTL ? 'Previous page' : 'Next page'} onClick={() => (isRTL ? prevPage() : nextPage())} className="absolute inset-y-0 right-0 z-10 w-[35%] cursor-e-resize touch-manipulation" />
          <div className="flex h-full w-full items-center justify-center gap-[2px] px-2 pb-14 pt-16">
            {pair.map((i) => (
              <div key={`${content.url}-${i}`} className="flex h-full items-center justify-center overflow-hidden">
                {failedPages.has(i) ? (
                  <div className="flex flex-col items-center gap-3 text-zinc-500"><ImageOff size={36} /><button onClick={() => retryPage(i)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"><RotateCw size={12} /> Retry page {i + 1}</button></div>
                ) : (
                  <img
                    src={content.images[i]}
                    alt={`Page ${i + 1}`}
                    draggable={false}
                    className="max-h-full max-w-full object-contain"
                    onError={() => setFailedPages((s) => new Set(s).add(i))}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== chapter flash ===== */}
      <AnimatePresence>
        {chapterFlash && (
          <motion.div key={chapterFlash + content?.url} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/45">
            <p className="font-display text-4xl tracking-[0.2em] text-zinc-100 sm:text-6xl">CH. {chapterFlash}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== top toolbar ===== */}
      <div className={`absolute inset-x-0 top-0 z-30 transition-transform duration-500 ${chrome ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
          <div className="glass-strong flex min-w-0 flex-1 items-center gap-1 rounded-2xl px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
            <Link to={`/series/${slug}`} aria-label="Back to series" className="rounded-xl p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"><ArrowLeft size={18} /></Link>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[11px] font-semibold text-zinc-100 sm:text-xs">{seriesTitle}</p>
              <p className="text-[9px] text-zinc-500 sm:text-[10px]">Chapter {content?.name ?? chapter} Ã‚Â· {prefs.mode === 'vertical' ? 'Scroll' : `Page ${page + 1}/${pageCount}`}</p>
            </div>
            <button onClick={() => (prevChapter ? goToChapter(prevChapter) : toast('First chapter', 'info'))} disabled={!prevChapter} aria-label="Previous chapter" className="rounded-xl p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-25"><ChevronLeft size={18} /></button>
            <button onClick={() => setChapterOpen((v) => !v)} aria-label="Select chapter" aria-expanded={chapterOpen} className="relative rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-zinc-100 transition hover:bg-white/10 sm:px-3 sm:text-xs">Ch.{content?.name ?? 'Ã¢â‚¬â€'}</button>
            <button onClick={() => (nextChapter ? goToChapter(nextChapter) : toast('Latest chapter reached', 'info'))} disabled={!nextChapter} aria-label="Next chapter" className="rounded-xl p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-25"><ChevronRight size={18} /></button>
          </div>

          <div className="glass-strong flex items-center gap-0.5 rounded-2xl px-1.5 py-1.5 sm:gap-1 sm:px-2">
            <button onClick={() => updatePrefs({ direction: isRTL ? 'ltr' : 'rtl' })} title={isRTL ? 'Reading: Right Ã¢â€ â€™ Left' : 'Reading: Left Ã¢â€ â€™ Right'} aria-label="Toggle reading direction" className="rounded-xl p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"><ArrowRightLeft size={17} /></button>
            <button onClick={() => updatePrefs({ mode: prefs.mode === 'vertical' ? 'single' : prefs.mode === 'single' ? 'double' : 'vertical' })} title={`Mode: ${prefs.mode}`} aria-label="Cycle reading mode" className="rounded-xl p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white">
              {prefs.mode === 'vertical' ? <Rows3 size={17} /> : prefs.mode === 'single' ? <File size={17} /> : <Columns2 size={17} />}
            </button>
            <button onClick={toggleFullscreen} title="Fullscreen (F)" aria-label="Toggle fullscreen" className="rounded-xl p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white">{fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
            <button onClick={() => { setSettingsOpen((v) => !v); setChapterOpen(false); }} title="Reader settings" aria-label="Reader settings" aria-expanded={settingsOpen} className="rounded-xl p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"><Settings size={17} /></button>
          </div>
        </div>

        {/* settings popover */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-strong absolute right-2 top-full mt-1 w-72 rounded-2xl p-4 text-zinc-200 sm:right-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">Reader Settings</p>
                <button onClick={() => setSettingsOpen(false)} aria-label="Close settings" className="rounded-lg p-1 hover:bg-white/10"><X size={15} /></button>
              </div>
              {/* mode */}
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">Mode</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([['vertical', Rows3, 'Vertical'], ['single', File, 'Single'], ['double', Columns2, 'Double']] as const).map(([m, Icon, label]) => (
                  <button key={m} onClick={() => updatePrefs({ mode: m })} className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-medium transition ${prefs.mode === m ? 'border-[var(--accent)]/60 bg-[var(--accent)]/15 text-[var(--accent)]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}><Icon size={16} />{label}</button>
                ))}
              </div>
              {/* direction */}
              <p className="mb-1.5 mt-4 text-[10px] uppercase tracking-wider text-zinc-500">Direction</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(['rtl', 'ltr'] as const).map((d) => (
                  <button key={d} onClick={() => updatePrefs({ direction: d })} className={`rounded-xl border px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition ${prefs.direction === d ? 'border-[var(--accent)]/60 bg-[var(--accent)]/15 text-[var(--accent)]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>{d === 'rtl' ? 'RTL Ã‚Â· Manga' : 'LTR Ã‚Â· Western'}</button>
                ))}
              </div>
              {/* scale (vertical only) */}
              {prefs.mode === 'vertical' && (
                <>
                  <label className="mb-1 mt-4 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">Image width <span className="text-zinc-300">{prefs.imageScale}%</span></label>
                  <input type="range" min={60} max={140} step={5} value={prefs.imageScale} onChange={(e) => updatePrefs({ imageScale: Number(e.target.value) })} className="w-full accent-[#e8b64c]" aria-label="Image width" />
                  <label className="mb-1 mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">Page spacing <span className="text-zinc-300">{Math.round(prefs.spacing * 100)}%</span></label>
                  <input type="range" min={0} max={100} step={10} value={Math.round(prefs.spacing * 100)} onChange={(e) => updatePrefs({ spacing: Number(e.target.value) / 100 })} className="w-full accent-[#e8b64c]" aria-label="Page spacing" />
                </>
              )}
              {/* background */}
              <p className="mb-1.5 mt-4 text-[10px] uppercase tracking-wider text-zinc-500">Background</p>
              <div className="flex gap-2">
                {([['black', '#050505'], ['dark', '#101018'], ['sepia', '#e9dcc3']] as const).map(([name, c]) => (
                  <button key={name} onClick={() => updatePrefs({ background: name })} aria-label={`Background ${name}`} aria-pressed={prefs.background === name} className={`h-9 flex-1 rounded-xl border-2 transition ${prefs.background === name ? 'border-[var(--accent)]' : 'border-white/10'}`} style={{ background: c }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* chapter selector popover */}
        <AnimatePresence>
          {chapterOpen && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-strong absolute left-1/2 top-full z-40 mt-1 w-80 max-w-[94vw] -translate-x-1/2 rounded-2xl p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400"><List size={12} /> Chapters</p>
                <button onClick={() => setChapterOpen(false)} aria-label="Close" className="rounded-lg p-1 hover:bg-white/10"><X size={14} /></button>
              </div>
              <input autoFocus value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)} placeholder="Find chapterÃ¢â‚¬Â¦" aria-label="Filter chapters" className="input mb-2 w-full px-3 py-2 text-xs" />
              <div ref={listRef} className="max-h-80 overflow-y-auto pr-1">
                {filteredChapters.map((c) => {
                  const current = c.slug === chapter;
                  const readPage = storage.chapterProgress(slug ?? '')[c.slug];
                  return (
                    <button key={c.slug} data-current={current} onClick={() => { setChapterOpen(false); goToChapter(c); }} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition ${current ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-zinc-300 hover:bg-white/5'}`}>
                      <span className="font-semibold">Chapter {c.name}</span>
                      <span className="inline-flex items-center gap-2 text-[10px] text-zinc-500">{readPage !== undefined && <span className="text-emerald-500">read</span>}<Check size={12} className={current ? 'opacity-100' : 'opacity-0'} /></span>
                    </button>
                  );
                })}
                {filteredChapters.length === 0 && <p className="px-3 py-6 text-center text-xs text-zinc-500">Nothing matches Ã¢â‚¬Å“{chapterFilter}Ã¢â‚¬Â.</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== bottom progress bar ===== */}
      <div className={`absolute inset-x-0 bottom-0 z-30 transition-transform duration-500 ${chrome ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto max-w-7xl px-3 pb-3">
          <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-2">
            <span className="text-[10px] font-bold tabular-nums text-zinc-400">{prefs.mode === 'vertical' ? `${Math.round(scrollFrac * 100)}%` : `${page + 1}/${pageCount}`}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--accent)] transition-transform duration-300 ease-out" style={{ transform: `scaleX(${progress})`, transformOrigin: isRTL ? 'right' : 'left' }} /></div>
            <span className="text-[9px] uppercase tracking-[0.25em] text-zinc-500">{isRTL ? 'RTL' : 'LTR'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
