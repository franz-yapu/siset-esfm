import { Prisma } from '../bd/generado/client';
import { ErrorConflicto, ErrorNoEncontrado, type ErrorApp } from './errores';

/** Traduce los errores conocidos de Prisma a errores de la API; devuelve null si no lo reconoce. */
export function traducirErrorPrisma(e: unknown): ErrorApp | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (e.code) {
    case 'P2002':
      return new ErrorConflicto('Ya existe un registro con esos datos.', { campos: e.meta?.target ?? null });
    case 'P2003':
      return new ErrorConflicto('La operación no es posible porque el registro está relacionado con otros datos.');
    case 'P2025':
      return new ErrorNoEncontrado();
    default:
      return null;
  }
}
