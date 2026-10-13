import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Datos de la petición disponibles en cualquier capa (SDD S0.7 §2.5). */
export interface ContextoPeticion {
  idPeticion: string;
  ip: string | null;
  userAgent: string | null;
  /** null hasta que la autenticación (S1.x) lo asigne. */
  usuarioId: number | null;
}

const almacen = new AsyncLocalStorage<ContextoPeticion>();
const ID_VALIDO = /^[A-Za-z0-9-]{1,64}$/;

export const obtenerContexto = (): ContextoPeticion | undefined => almacen.getStore();

/** Corre `fn` dentro de un contexto dado (tests, tareas fuera de HTTP). */
export const conContexto = <T>(contexto: ContextoPeticion, fn: () => T): T => almacen.run(contexto, fn);

/** Primer middleware: crea el contexto y devuelve el id en `X-Request-Id`. */
export const middlewareContexto: RequestHandler = (req, res, next) => {
  const recibido = req.get('x-request-id');
  const contexto: ContextoPeticion = {
    idPeticion: recibido && ID_VALIDO.test(recibido) ? recibido : randomUUID(),
    ip: req.ip ?? null,
    userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
    usuarioId: null,
  };
  res.setHeader('X-Request-Id', contexto.idPeticion);
  almacen.run(contexto, () => next());
};
