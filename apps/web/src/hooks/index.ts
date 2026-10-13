import { useCallback, useContext, useEffect, useRef, useState, type DependencyList } from 'react';
import { AuthContext, type ApiAuth } from '@/context/AuthContext';
import { ToastContext, type ApiToast } from '@/context/ToastContext';
import type { Usuario } from '@/types';
import { puedeVer } from '@/config/permisos';

export function useAuth(): ApiAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}

/** Usuario logueado; solo se usa dentro de rutas protegidas. */
export function useUsuario(): Usuario {
  const { usuario } = useAuth();
  if (!usuario) throw new Error('Sin sesión');
  return usuario;
}

export function useToast(): ApiToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast fuera de ToastProvider');
  return ctx;
}

export function usePermiso(permiso: string): boolean {
  const { usuario } = useAuth();
  return usuario ? puedeVer(usuario.rol, permiso) : false;
}

const EVENTO_CAMBIO = 'siset:cambio';

/** Avisa que cambiaron datos (el header recalcula la campana de alertas). */
export const avisarCambio = (): void => {
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
};

/** Re-renderiza el componente cada vez que alguna acción cambia datos. */
export function useCambios(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const f = () => setN((x) => x + 1);
    window.addEventListener(EVENTO_CAMBIO, f);
    return () => window.removeEventListener(EVENTO_CAMBIO, f);
  }, []);
  return n;
}

export interface Async<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Ejecuta una función async del servicio y expone data/loading/error + reload. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): Async<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  // Corre antes que el efecto de carga (mismo componente, orden de declaración).
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let vivo = true;
    // Recargar al cambiar deps exige volver a "cargando"; TanStack Query reemplaza este hook en S0.8.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fnRef
      .current()
      .then((d) => {
        if (vivo) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (vivo) setError(e instanceof Error ? e.message : 'Error inesperado');
      })
      .finally(() => {
        if (vivo) setLoading(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}

/** Ejecuta una acción con toast de éxito/error y estado "ocupado". */
export function useAccion() {
  const toast = useToast();
  const [ocupado, setOcupado] = useState(false);
  const ejecutar = useCallback(
    async (fn: () => Promise<unknown>, exito?: string): Promise<boolean> => {
      setOcupado(true);
      try {
        await fn();
        avisarCambio();
        if (exito) toast.success(exito);
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error inesperado');
        return false;
      } finally {
        setOcupado(false);
      }
    },
    [toast],
  );
  return { ejecutar, ocupado };
}
