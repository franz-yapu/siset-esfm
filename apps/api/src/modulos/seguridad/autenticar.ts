import type { RequestHandler, Response } from 'express';
import { ErrorNoAutenticado } from '@/compartido/errores';
import { obtenerContexto } from '@/compartido/http';
import { verificarAccessToken, type DatosAccessToken } from './jwt';

/** Quién hace la petición, según su access token (SDD S1.5 §2.4). */
export type SesionUsuario = DatosAccessToken;

/**
 * Verifica el `Authorization: Bearer` sin consultar la base: el token dura 15 min y
 * el refresh revisa el estado del usuario. Deja la sesión en `res.locals` y el
 * usuario en el contexto, así cada evento de la bitácora sabe quién lo hizo.
 * La autorización por rol se agrega encima (S1.6).
 */
export const crearAutenticar =
  (jwtSecreto: string): RequestHandler =>
  async (req, res, next) => {
    const [tipo, token] = req.get('authorization')?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) throw new ErrorNoAutenticado();
    let sesion: SesionUsuario;
    try {
      sesion = await verificarAccessToken(token, jwtSecreto);
    } catch {
      throw new ErrorNoAutenticado();
    }
    res.locals.sesion = sesion;
    const contexto = obtenerContexto();
    if (contexto) contexto.usuarioId = sesion.usuarioId;
    next();
  };

/** La sesión de una ruta protegida. Lanza si la ruta no pasó por `autenticar` (error de programación). */
export function sesionDe(res: Response): SesionUsuario {
  const sesion = res.locals.sesion as SesionUsuario | undefined;
  if (!sesion) throw new Error('La ruta no pasó por autenticar.');
  return sesion;
}
