import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Alert, { type AlertKind } from './Alert';

type Kind = Extract<AlertKind, 'success' | 'error' | 'info'>;
interface ToastItem {
  id: number;
  kind: Kind;
  text: string;
}
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, kind: Kind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((t) => (
          <Alert key={t.id} kind={t.kind} className="pointer-events-auto shadow-pop">
            {t.text}
          </Alert>
        ))}
      </div>
    </Ctx.Provider>
  );
}
