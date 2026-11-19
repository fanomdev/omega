import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'info' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++seq;
    setToasts((t) => [...t.slice(-2), { id, kind, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 z-[90] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              className="glass flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-zinc-100 shadow-glass"
              role="status"
            >
              {t.kind === 'success'
                ? <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                : t.kind === 'error'
                  ? <X size={18} className="shrink-0 text-red-400" />
                  : <Info size={18} className="shrink-0 text-accent" />}
              <span className="flex-1">{t.message}</span>
              <button onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))} aria-label="Dismiss" className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
