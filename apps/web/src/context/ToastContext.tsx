import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { X, XCircle } from 'lucide-react';
import { CheckAnimado } from '@/components/ui/CheckAnimado';
import clsx from 'clsx';

interface Toast {
  id: number;
  tipo: 'ok' | 'error';
  mensaje: string;
}
export interface ApiToast {
  success: (m: string) => void;
  error: (m: string) => void;
}

export const ToastContext = createContext<ApiToast | null>(null);

/** Notificaciones abajo a la derecha; se cierran solas a los 3 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sig = useRef(0);

  const quitar = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const agregar = useCallback(
    (tipo: Toast['tipo'], mensaje: string) => {
      const id = ++sig.current;
      setToasts((t) => [...t, { id, tipo, mensaje }]);
      setTimeout(() => quitar(id), 3000);
    },
    [quitar],
  );

  const api = useMemo<ApiToast>(
    () => ({ success: (m) => agregar('ok', m), error: (m) => agregar('error', m) }),
    [agregar],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="no-print pointer-events-none fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={clsx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg',
              t.tipo === 'ok' ? 'bg-green-600' : 'bg-red-600',
            )}
          >
            {t.tipo === 'ok' ? (
              <CheckAnimado className="mt-0.5 size-4" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0" />
            )}
            <span className="flex-1">{t.mensaje}</span>
            <button
              type="button"
              onClick={() => quitar(t.id)}
              aria-label="Cerrar"
              className="opacity-80 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
