import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Latest from './pages/Latest';
import Yaoi from './pages/Yaoi';
import Random from './pages/Random';
import MangaDetails from './pages/MangaDetails';
import MangaReader from './pages/MangaReader';

import Library from './pages/Library';
import NotFound from './pages/NotFound';
import { USE_MOCKS, service } from './services';
import { storage } from './utils/storage';

function Footer() {
  const [upstream, setUpstream] = useState<string | null>(null);
  useEffect(() => { service.health().then((h) => setUpstream(h.data?.status ?? null)).catch(() => setUpstream('unreachable')); }, []);
  return (
    <footer className="relative z-10 border-t divider">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-[11px] text-[var(--text-faint)] sm:flex-row sm:px-6">
        <p>OMEGA — an independent reading client. Data & covers belong to their respective owners.</p>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${upstream === 'ok' ? 'bg-emerald-400' : upstream === 'unreachable' ? 'bg-red-400' : 'bg-amber-400'}`} />API: {USE_MOCKS ? 'demo mode' : (upstream ?? 'checking…')}</span>
          <span>Press <kbd className="chip !px-1.5 !py-0.5">/</kbd> to search</span>
        </div>
      </div>
    </footer>
  );
}

function Shell() {
  const location = useLocation();
  const isReader = location.pathname.startsWith('/read/');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => storage.theme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    storage.saveTheme(theme);
  }, [theme]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {!isReader && <Navbar theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />}
      <div className="relative flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.32, ease: 'easeOut' }}>
            <ErrorBoundary>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/latest" element={<Latest />} />
                <Route path="/yaoi" element={<Yaoi />} />
                <Route path="/random" element={<Random />} />
                <Route path="/series/:slug" element={<MangaDetails />} />
                <Route path="/read/:slug/:chapter" element={<ErrorBoundary><MangaReader /></ErrorBoundary>} />
                <Route path="/library" element={<Library />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </div>
      {!isReader && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </ToastProvider>
    </MotionConfig>
  );
}
