import type { CookieOptions, RequestHandler } from 'express';
import { datosValidos } from '@/compartido/http';
import { esquemasLogin, type RespuestaLogin } from './auth.esquemas';
import { DURACION_REFRESH_MS, type ServicioAuth } from './auth.servicio';

export const COOKIE_REFRESH = 'siset_refresh';

/** HttpOnly + Secure + SameSite=Strict, y solo viaja a /auth (SDD S1.3 §2.3). */
export const opcionesCookieRefresh = (maxAgeMs: number): CookieOptions => ({
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: maxAgeMs,
});

export const crearControladorAuth = (servicio: ServicioAuth) => {
  const login: RequestHandler = async (_req, res) => {
    const { body } = datosValidos(res, esquemasLogin);
    // refreshExpiraEn queda para S1.5: la rotación hereda ese vencimiento (DEC-012).
    const { refreshToken, refreshExpiraEn: _vence, ...respuesta } = await servicio.login(body.usuario, body.password);
    void _vence;
    res.cookie(COOKIE_REFRESH, refreshToken, opcionesCookieRefresh(DURACION_REFRESH_MS));
    res.json(respuesta satisfies RespuestaLogin);
  };
  return { login };
};
