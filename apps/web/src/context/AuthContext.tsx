import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Usuario } from '@/types';
import { authService } from '@/services/auth.service';
import { reiniciarDemo } from '@/services/demo.service';

const CLAVE = 'siset.sesion';

export interface ApiAuth {
  usuario: Usuario | null;
  cargando: boolean;
  login: (usuario: string, clave: string) => Promise<Usuario>;
  logout: () => Promise<void>;
  /** Selector "Ver como" (solo demo): cambia de usuario sin cerrar sesión. */
  verComo: (id: number) => Promise<void>;
  /** Vuelve a leer el usuario (ej. después de cambiar la contraseña). */
  refrescar: () => Promise<void>;
  /** Incrementa al reiniciar los datos de demo; el layout remonta las pantallas. */
  version: number;
  reiniciar: () => Promise<void>;
}

export const AuthContext = createContext<ApiAuth | null>(null);

const leerSesion = (): number | null => {
  try {
    const v = sessionStorage.getItem(CLAVE);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
};
const guardarSesion = (id: number | null) => {
  try {
    if (id === null) sessionStorage.removeItem(CLAVE);
    else sessionStorage.setItem(CLAVE, String(id));
  } catch {
    /* sin sessionStorage: la sesión dura lo que la pestaña */
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  // Sin sesión guardada no hay nada que cargar: se arranca listo.
  const [cargando, setCargando] = useState(() => leerSesion() !== null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const id = leerSesion();
    if (id === null) return;
    authService
      .obtener(id)
      .then((u) => {
        setUsuario(u);
        if (!u) guardarSesion(null);
      })
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (u: string, c: string) => {
    const real = await authService.login(u, c);
    guardarSesion(real.id);
    setUsuario(real);
    return real;
  }, []);

  const logout = useCallback(async () => {
    if (usuario) await authService.logout(usuario);
    guardarSesion(null);
    setUsuario(null);
  }, [usuario]);

  const verComo = useCallback(async (id: number) => {
    const u = await authService.obtener(id);
    if (!u) return;
    guardarSesion(u.id);
    setUsuario(u);
  }, []);

  const refrescar = useCallback(async () => {
    if (!usuario) return;
    setUsuario(await authService.obtener(usuario.id));
  }, [usuario]);

  const reiniciar = useCallback(async () => {
    reiniciarDemo();
    if (usuario) setUsuario(await authService.obtener(usuario.id));
    setVersion((v) => v + 1);
  }, [usuario]);

  const api = useMemo<ApiAuth>(
    () => ({ usuario, cargando, login, logout, verComo, refrescar, version, reiniciar }),
    [usuario, cargando, login, logout, verComo, refrescar, version, reiniciar],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}
