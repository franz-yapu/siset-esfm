import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import { ErrorApp } from '@/compartido/errores';
import { datosValidos } from '@/compartido/http';
import { esquemasCambiarPassword, esquemasLogin, type RespuestaLogin } from './auth.esquemas';
import { sesionDe } from './autenticar';
import { CODIGO_SESION_INVALIDA, type ResultadoLogin, type ServicioAuth } from './auth.servicio';

export const COOKIE_REFRESH = 'siset_refresh';

const opcionesBase: CookieOptions = { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/v1/auth' };

/** HttpOnly + Secure + SameSite=Strict, y solo viaja a /auth (SDD S1.3 §2.3). */
export const opcionesCookieRefresh = (maxAgeMs: number): CookieOptions => ({ ...opcionesBase, maxAge: maxAgeMs });

const cookieDe = (req: Request): string | undefined => {
  const valor: unknown = req.cookies?.[COOKIE_REFRESH];
  return typeof valor === 'string' && valor ? valor : undefined;
};

const borrarCookie = (res: Response) => res.clearCookie(COOKIE_REFRESH, opcionesBase);

/** Escribe la cookie con lo que le queda a la sesión y responde el cuerpo del login. */
function responderSesion(res: Response, { refreshToken, refreshExpiraEn, ...respuesta }: ResultadoLogin) {
  // En segundos enteros hacia arriba: recién emitida, la cookie dice exactamente 28800 (8 h).
  const restanteMs = Math.ceil(Math.max(0, refreshExpiraEn.getTime() - Date.now()) / 1000) * 1000;
  res.cookie(COOKIE_REFRESH, refreshToken, opcionesCookieRefresh(restanteMs));
  res.json(respuesta satisfies RespuestaLogin);
}

export const crearControladorAuth = (servicio: ServicioAuth) => {
  const login: RequestHandler = async (_req, res) => {
    const { body } = datosValidos(res, esquemasLogin);
    responderSesion(res, await servicio.login(body.usuario, body.password));
  };

  const refrescar: RequestHandler = async (req, res) => {
    try {
      responderSesion(res, await servicio.refrescar(cookieDe(req)));
    } catch (e) {
      // Sesión inválida: además del 401, se borra la cookie (SDD S1.5 §2.1).
      if (e instanceof ErrorApp && e.codigo === CODIGO_SESION_INVALIDA) borrarCookie(res);
      throw e;
    }
  };

  const logout: RequestHandler = async (req, res) => {
    await servicio.cerrarSesion(cookieDe(req));
    borrarCookie(res);
    res.status(204).end();
  };

  const cambiarPassword: RequestHandler = async (_req, res) => {
    const { body } = datosValidos(res, esquemasCambiarPassword);
    responderSesion(
      res,
      await servicio.cambiarPassword(sesionDe(res).usuarioId, body.passwordActual, body.passwordNueva),
    );
  };

  return { login, refrescar, logout, cambiarPassword };
};
