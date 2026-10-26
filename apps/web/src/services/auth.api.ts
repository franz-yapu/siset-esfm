import type { Usuario } from '@/types';
import { api, renovarSesion } from '@/lib/api';
import { ErrorApi } from '@/lib/errores';
import { borrarAccessToken, guardarAccessToken, type RespuestaSesion } from '@/lib/sesion';
import type { authMock } from './auth.mock';

/** Respuesta de POST /auth/login, /auth/refresh y /auth/cambiar-password (SDD S1.3 §2.1). */
export type RespuestaLogin = RespuestaSesion;

/** Traduce el usuario de la API al `Usuario` que ya usan las pantallas. */
export const aUsuario = ({ debeCambiarPassword, ultimoAcceso, ...u }: RespuestaLogin['usuario']): Usuario => ({
  ...u,
  debeCambiarClave: debeCambiarPassword,
  ...(ultimoAcceso ? { ultimoAcceso } : {}),
});

/**
 * authService contra la API (SDD S0.8 §2.4, contrato de S1.3). Solo implementa
 * lo que define el PRD §5.
 */
export const authApi: typeof authMock = {
  async login(usuario: string, password: string, captcha?: string): Promise<Usuario> {
    // `password`, no `clave`: así lo tapa la redacción de logs y bitácora (DEC-011). `captcha`: ADR-0012.
    const { data } = await api.post<RespuestaLogin>('/auth/login', { usuario, password, captcha });
    guardarAccessToken(data.accessToken);
    return aUsuario(data.usuario);
  },

  /** Revoca el refresh de la cookie (la API registra LOGOUT). Nunca rechaza: la sesión local se limpia igual. */
  async logout(_u: Usuario | null): Promise<void> {
    void _u;
    borrarAccessToken();
    await api.post('/auth/logout').catch(() => undefined);
  },

  /** Recupera la sesión con la cookie httpOnly (SDD S1.10 §2.2). Sin sesión o sin red: null. */
  async restaurar(): Promise<Usuario | null> {
    try {
      return aUsuario((await renovarSesion()).usuario);
    } catch {
      return null;
    }
  },

  /** "Ver como" solo existe en la demo, con todo en mock (SDD S0.8 §2.5). */
  async verComo(_id: number): Promise<Usuario | null> {
    void _id;
    throw new ErrorApi('"Ver como" solo está disponible en la demo.', 'NO_DISPONIBLE');
  },

  /** Cierra todas las sesiones y devuelve una nueva sin la obligación de cambiarla (SDD S1.5 §2.3, S1.9 §2.3). */
  async cambiarPassword(_u: Usuario, passwordActual: string, passwordNueva: string): Promise<Usuario> {
    void _u;
    const { data } = await api.post<RespuestaLogin>('/auth/cambiar-password', { passwordActual, passwordNueva });
    guardarAccessToken(data.accessToken);
    return aUsuario(data.usuario);
  },

  usuariosDemo(): Usuario[] {
    return [];
  },
};
