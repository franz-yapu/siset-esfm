// Access token de la API (SDD S1.3 §2.6). Vive solo en memoria, nunca en
// localStorage: un XSS no lo puede leer después. Al recargar se pierde y se
// recupera con el refresh de la cookie httpOnly (SDD S1.10 §2.3).

import type { Rol } from '@/types';

let accessToken: string | null = null;

export const guardarAccessToken = (token: string): void => {
  accessToken = token;
};

export const obtenerAccessToken = (): string | null => accessToken;

export const borrarAccessToken = (): void => {
  accessToken = null;
};

/** Cuerpo de login, refresh y cambiar-password (SDD S1.3 §2.1, S1.5 §2.1). */
export interface RespuestaSesion {
  accessToken: string;
  expiraEn: string;
  usuario: {
    id: number;
    usuario: string;
    nombre: string;
    rol: Rol;
    sedeId: number | null;
    activo: boolean;
    debeCambiarPassword: boolean;
    ultimoAcceso: string | null;
  };
}

/** Lo que `lib/api.ts` avisa al contexto sin depender de React (SDD S1.10 §2.3). */
export type EventoSesion = { tipo: 'renovada'; respuesta: RespuestaSesion } | { tipo: 'perdida' };

const oyentes = new Set<(e: EventoSesion) => void>();

/** Se suscribe a los eventos de sesión; devuelve la función para desuscribirse. */
export const suscribirSesion = (fn: (e: EventoSesion) => void): (() => void) => {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
};

export const emitirSesion = (e: EventoSesion): void => {
  for (const fn of oyentes) fn(e);
};
