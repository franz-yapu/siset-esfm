import type { RequestHandler } from 'express';
import type { Enforcer } from 'casbin';
import { ErrorProhibido } from '@/compartido/errores';
import { sesionDe } from './autenticar';
import { crearEnforcer } from './autorizacion.enforcer';
import type { Accion, Recurso } from './autorizacion.politica';

export interface PermisoConcedido {
  recurso: Recurso;
  accion: Accion;
}

/**
 * `autorizar(recurso, ...acciones)` (SDD S1.6 §2.3). Va después de `autenticar`.
 * Con `cpw` en el token, 403 CAMBIO_PASSWORD_REQUERIDO; si alguna acción está
 * permitida para el rol, deja en `res.locals.permiso` la primera y sigue; si no, 403.
 * Con `leer_propio`, el servicio TIENE QUE filtrar por la persona de la sesión.
 */
export function crearAutorizar() {
  // Una sola vez por app, perezoso: crearApp sigue siendo síncrono.
  let enforcer: Promise<Enforcer> | undefined;
  const obtener = () => (enforcer ??= crearEnforcer());

  return (recurso: Recurso, ...acciones: Accion[]): RequestHandler =>
    async (_req, res, next) => {
      const sesion = sesionDe(res);
      if (sesion.debeCambiarPassword) {
        throw new ErrorProhibido('Debe cambiar su contraseña antes de continuar.', 'CAMBIO_PASSWORD_REQUERIDO');
      }
      const e = await obtener();
      for (const accion of acciones) {
        if (await e.enforce(sesion.rol, recurso, accion)) {
          res.locals.permiso = { recurso, accion } satisfies PermisoConcedido;
          next();
          return;
        }
      }
      throw new ErrorProhibido();
    };
}

export type Autorizar = ReturnType<typeof crearAutorizar>;
