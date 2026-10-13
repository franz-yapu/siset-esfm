import type { RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { ErrorValidacion } from '../errores';

interface Esquemas {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}

type Datos<E extends Esquemas> = { [K in keyof E]: E[K] extends z.ZodType ? z.output<E[K]> : never };

/**
 * Valida body, params y query con Zod (SDD S0.7 §2.4). Los datos parseados
 * (con coerción y defaults) quedan en `res.locals.valido`: en Express 5,
 * `req.query` es de solo lectura.
 */
export function validar<E extends Esquemas>(esquemas: E): RequestHandler {
  return (req, res, next) => {
    const valido: Record<string, unknown> = {};
    const problemas: { ruta: string; mensaje: string }[] = [];
    for (const parte of ['params', 'query', 'body'] as const) {
      const esquema = esquemas[parte];
      if (!esquema) continue;
      const r = esquema.safeParse(req[parte]);
      if (r.success) valido[parte] = r.data;
      else problemas.push(...r.error.issues.map((i) => ({ ruta: [parte, ...i.path].join('.'), mensaje: i.message })));
    }
    if (problemas.length) {
      next(new ErrorValidacion(problemas));
      return;
    }
    res.locals.valido = valido;
    next();
  };
}

/** Lee en el controlador los datos que dejó `validar` con su tipo. */
export const datosValidos = <E extends Esquemas>(res: Response, _esquemas: E): Datos<E> => {
  void _esquemas;
  return res.locals.valido as Datos<E>;
};
