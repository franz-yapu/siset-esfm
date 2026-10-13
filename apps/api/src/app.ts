import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import type { ClienteBd } from '@/compartido/bd';
import type { Config } from '@/compartido/config';
import { crearManejadorErrores, rutaNoEncontrada } from '@/compartido/errores';
import {
  crearDocumentoOpenApi,
  middlewareContexto,
  obtenerContexto,
  routerDocs,
  type ModuloHttp,
} from '@/compartido/http';
import { crearLogger } from '@/compartido/logger';
import { crearModuloSalud } from '@/modulos/salud';

export interface DependenciasApp {
  bd: ClienteBd;
  config: Config;
  logger?: Logger;
  version?: string;
  /** Solo para tests: módulos extra montados bajo /api/v1. */
  modulosExtra?: ModuloHttp[];
}

/**
 * Raíz de composición (ADR-0001, SDD S0.7 §2): el único lugar que conoce a todos
 * los módulos y les inyecta sus dependencias.
 */
export function crearApp({
  bd,
  config,
  logger = crearLogger(config),
  version = '0.0.0',
  modulosExtra = [],
}: DependenciasApp): Express {
  const app = express();
  app.set('trust proxy', config.trustProxy);

  app.use(middlewareContexto);
  app.use(pinoHttp({ logger, genReqId: () => obtenerContexto()?.idPeticion ?? randomUUID() }));
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigen, credentials: true }));
  app.use(express.json({ limit: config.jsonLimite }));

  const modulos: ModuloHttp[] = [crearModuloSalud({ bd, version }), ...modulosExtra];
  const api = Router();
  for (const m of modulos) api.use(m.router);
  if (config.entorno !== 'production') {
    api.use(
      routerDocs(
        crearDocumentoOpenApi(
          modulos.map((m) => m.openapi),
          version,
        ),
      ),
    );
  }
  app.use('/api/v1', api);

  app.use(rutaNoEncontrada);
  app.use(crearManejadorErrores(logger));
  return app;
}
