import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Usuario } from '@/types';
import { authService } from '@/services/auth.service';
import { aUsuario } from '@/services/auth.api';
import { reiniciarDemo } from '@/services/demo.service';
import { borrarAccessToken, suscribirSesion } from '@/lib/sesion';
import {
  borrarUltimaActividad,
  crearVigilante,
  escribirUltimaActividad,
  leerUltimaActividad,
  vigilarNavegador,
  type Vigilante,
} from '@/lib/inactividad';
import { AvisoInactividad } from '@/components/sesion/AvisoInactividad';
import { sesionInicial, type MotivoCierre } from './sesion-inicial';

export type { MotivoCierre } from './sesion-inicial';

/** Contrato público de `useAuth()` (SDD S1.10 §2.1). */
export interface ApiAuth {
  /** Usuario de la sesión, o null. Cambia al iniciar, cerrar, perder la sesión o renovarla (rol/sede/cpw frescos). */
  usuario: Usuario | null;
  /** true solo mientras se restaura la sesión al arrancar. */
  cargando: boolean;
  /** Inicia sesión. Rechaza con ErrorApi (CREDENCIALES_INVALIDAS, DEMASIADAS_PETICIONES, SIN_CONEXION…). */
  login: (usuario: string, password: string) => Promise<Usuario>;
  /** Cierra sesión. Nunca rechaza: si la API falla, igual limpia la sesión local. */
  logout: () => Promise<void>;
  /** Vuelve a leer el usuario de la sesión (en API: POST /auth/refresh, que relee rol, sede y cpw). */
  refrescar: () => Promise<void>;
  /** Cambia la propia contraseña y se queda con la sesión nueva que devuelve la API (SDD S1.9 §2.4). */
  cambiarPassword: (passwordActual: string, passwordNueva: string) => Promise<Usuario>;
  /** Por qué terminó la última sesión sin que el usuario la cerrara; null tras un login o un logout manual. */
  motivoCierre: MotivoCierre | null;
  /** Selector "Ver como" (solo demo): cambia de usuario sin cerrar sesión. */
  verComo: (id: number) => Promise<void>;
  /** Incrementa al reiniciar los datos de demo; el layout remonta las pantallas. */
  version: number;
  reiniciar: () => Promise<void>;
}

export const AuthContext = createContext<ApiAuth | null>(null);

/** Avisa a las otras pestañas que la sesión se cerró (SDD S1.10 §2.5). */
const CANAL = 'siset-sesion';
interface MensajeCanal {
  tipo: 'cerrada';
  motivo: MotivoCierre | null;
}
const esMensajeCanal = (x: unknown): x is MensajeCanal =>
  typeof x === 'object' && x !== null && (x as Record<string, unknown>).tipo === 'cerrada';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [motivoCierre, setMotivoCierre] = useState<MotivoCierre | null>(null);
  const [aviso, setAviso] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const usuarioRef = useRef<Usuario | null>(null);
  const canal = useRef<BroadcastChannel | null>(null);
  const vigilante = useRef<Vigilante | null>(null);

  useEffect(() => {
    usuarioRef.current = usuario;
  }, [usuario]);

  /** Deja la sesión local vacía. No llama a la API. */
  const limpiar = useCallback(
    (motivo: MotivoCierre | null) => {
      borrarAccessToken();
      borrarUltimaActividad();
      usuarioRef.current = null;
      setUsuario(null);
      setAviso(null);
      setMotivoCierre(motivo);
      queryClient.clear();
    },
    [queryClient],
  );

  const avisarPestanas = useCallback((motivo: MotivoCierre | null) => {
    canal.current?.postMessage({ tipo: 'cerrada', motivo } satisfies MensajeCanal);
  }, []);

  // Arranque: restaura con la cookie, salvo que la última actividad ya pasó el límite.
  // El refresh es de vuelo único: el doble efecto de StrictMode no manda dos (SDD S1.10 §2.3).
  useEffect(() => {
    let vigente = true;
    void sesionInicial({
      ahora: Date.now(),
      ultimaActividad: leerUltimaActividad(),
      restaurar: () => authService.restaurar(),
      cerrar: () => authService.logout(null),
    })
      .then(({ usuario: u, motivo }) => {
        if (!vigente) return;
        if (motivo) borrarUltimaActividad();
        setUsuario(u);
        setMotivoCierre(motivo);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  // Lo que avisa el cliente HTTP: un refresh trae el usuario al día; uno fallido, la sesión perdida.
  useEffect(
    () =>
      suscribirSesion((e) => {
        if (e.tipo === 'renovada') {
          setUsuario(aUsuario(e.respuesta.usuario));
        } else if (usuarioRef.current) {
          limpiar('SESION_VENCIDA');
          avisarPestanas('SESION_VENCIDA');
        }
      }),
    [limpiar, avisarPestanas],
  );

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const c = new BroadcastChannel(CANAL);
    canal.current = c;
    c.onmessage = (ev: MessageEvent<unknown>) => {
      if (esMensajeCanal(ev.data) && usuarioRef.current) limpiar(ev.data.motivo);
    };
    return () => {
      c.close();
      canal.current = null;
    };
  }, [limpiar]);

  // Vigilante de inactividad mientras haya sesión (SDD S1.10 §2.4).
  const usuarioId = usuario?.id ?? null;
  useEffect(() => {
    if (usuarioId === null) return;
    const v = crearVigilante({
      ahora: Date.now,
      leer: leerUltimaActividad,
      escribir: escribirUltimaActividad,
      alAvisar: setAviso,
      alReanudar: () => setAviso(null),
      alVencer: () => {
        const u = usuarioRef.current;
        limpiar('INACTIVIDAD');
        avisarPestanas('INACTIVIDAD');
        void authService.logout(u);
      },
    });
    vigilante.current = v;
    const soltar = vigilarNavegador(v);
    return () => {
      soltar();
      vigilante.current = null;
    };
  }, [usuarioId, limpiar, avisarPestanas]);

  const login = useCallback(
    async (u: string, password: string) => {
      const real = await authService.login(u, password);
      queryClient.clear();
      escribirUltimaActividad(Date.now());
      setMotivoCierre(null);
      setUsuario(real);
      return real;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await authService.logout(usuarioRef.current).catch(() => undefined);
    limpiar(null);
    avisarPestanas(null);
  }, [limpiar, avisarPestanas]);

  const verComo = useCallback(async (id: number) => {
    const u = await authService.verComo(id);
    if (u) setUsuario(u);
  }, []);

  const refrescar = useCallback(async () => {
    const u = await authService.restaurar();
    if (u) setUsuario(u);
    else if (usuarioRef.current) {
      limpiar('SESION_VENCIDA');
      avisarPestanas('SESION_VENCIDA');
    }
  }, [limpiar, avisarPestanas]);

  const cambiarPassword = useCallback(async (passwordActual: string, passwordNueva: string) => {
    const actual = usuarioRef.current;
    if (!actual) throw new Error('Sin sesión');
    const nuevo = await authService.cambiarPassword(actual, passwordActual, passwordNueva);
    setUsuario(nuevo);
    return nuevo;
  }, []);

  const reiniciar = useCallback(async () => {
    reiniciarDemo();
    setUsuario(await authService.restaurar());
    setVersion((v) => v + 1);
  }, []);

  const api = useMemo<ApiAuth>(
    () => ({
      usuario,
      cargando,
      login,
      logout,
      refrescar,
      cambiarPassword,
      motivoCierre,
      verComo,
      version,
      reiniciar,
    }),
    [usuario, cargando, login, logout, refrescar, cambiarPassword, motivoCierre, verComo, version, reiniciar],
  );

  return (
    <AuthContext.Provider value={api}>
      {children}
      {usuario && (
        <AvisoInactividad
          segundos={aviso}
          onSeguir={() => vigilante.current?.registrarActividad()}
          onCerrar={() => void logout()}
        />
      )}
    </AuthContext.Provider>
  );
}
