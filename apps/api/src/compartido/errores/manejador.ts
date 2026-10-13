import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';
import { ErrorApp, ErrorNoEncontrado } from './errores';
import { traducirErrorPrisma } from './prisma';

interface CuerpoError {
  error: { code: string; message: string; details?: unknown };
}

const cuerpo = (code: string, message: string, details?: unknown): CuerpoError => ({
  error: details === undefined ? { code, message } : { code, message, details },
});

/** Rutas inexistentes: 404 con el formato único. */
export const rutaNoEncontrada: RequestHandler = (_req, _res, next) => {
  next(new ErrorNoEncontrado('La ruta solicitada no existe.'));
};

interface ErrorDeBodyParser {
  type?: string;
  status?: number;
}

/**
 * Último middleware: todo error sale como `{ error: { code, message, details } }`
 * (PRD §5). Un error inesperado nunca expone su mensaje ni su stack: se registra
 * completo en el log, con el id de la petición.
 */
export const crearManejadorErrores =
  (logger: Logger): ErrorRequestHandler =>
  (err: unknown, _req, res, _next) => {
    void _next;
    const conocido = err instanceof ErrorApp ? err : traducirErrorPrisma(err);
    if (conocido) {
      res.status(conocido.estado).json(cuerpo(conocido.codigo, conocido.message, conocido.detalles));
      return;
    }

    const bp = err as ErrorDeBodyParser;
    if (bp?.type === 'entity.parse.failed') {
      res.status(400).json(cuerpo('JSON_INVALIDO', 'El cuerpo de la petición no es un JSON válido.'));
      return;
    }
    if (bp?.type === 'entity.too.large') {
      res.status(413).json(cuerpo('PAYLOAD_DEMASIADO_GRANDE', 'El cuerpo de la petición es demasiado grande.'));
      return;
    }

    logger.error({ err, idPeticion: res.getHeader('X-Request-Id') }, 'Error no controlado');
    res.status(500).json(cuerpo('ERROR_INTERNO', 'Ocurrió un error inesperado.'));
  };
