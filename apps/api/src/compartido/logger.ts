import { pino, type Logger, type DestinationStream } from 'pino';
import type { Config } from './config';

/** Rutas que nunca se escriben en el log (RNF-01). */
export const RUTAS_REDACTADAS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.tokenHash',
  '*.refreshToken',
];

export function crearLogger(config: Pick<Config, 'nivelLog'>, destino?: DestinationStream): Logger {
  return pino({ level: config.nivelLog, redact: RUTAS_REDACTADAS }, destino);
}
