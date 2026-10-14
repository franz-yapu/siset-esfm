import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
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
import { leerParametrosEnteros } from '@/modulos/catalogos';
import {
  actualizarPersona,
  buscarIdsPorNombre,
  buscarNombreCompleto,
  buscarNombresCompletos,
  buscarPersonaPorCi,
  crearPersona,
  obtenerPersonas,
} from '@/modulos/personas';
import { crearModuloAuditoria } from '@/modulos/auditoria';
import { crearModuloSalud } from '@/modulos/salud';
import {
  crearAutenticar,
  crearAutorizar,
  crearModuloAuth,
  crearModuloUsuarios,
  describirUsuarios,
} from '@/modulos/seguridad';

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
  app.use(cookieParser()); // la cookie del refresh (SDD S1.5 §2.5)

  const autenticar = crearAutenticar(config.jwtSecreto);
  const autorizar = crearAutorizar();
  // La raíz une seguridad y personas para la bitácora: auditoria no importa a ninguno (ADR-0001).
  const describir = async (ids: number[]) => {
    const usuarios = await describirUsuarios(bd, ids);
    const nombres = await buscarNombresCompletos(
      bd,
      usuarios.map((u) => u.personaId),
    );
    return new Map(usuarios.map((u) => [u.id, { usuario: u.username, nombre: nombres.get(u.personaId) ?? '' }]));
  };

  const modulos: ModuloHttp[] = [
    crearModuloSalud({ bd, version }),
    // La raíz une seguridad con personas: seguridad no importa a personas (SDD S1.3 §2.4).
    crearModuloAuth({
      bd,
      jwtSecreto: config.jwtSecreto,
      nombreDe: buscarNombreCompleto,
      leerParametros: leerParametrosEnteros,
      loginLimitePorMinuto: config.loginLimitePorMinuto,
    }),
    // Crear un usuario crea su persona en la misma transacción: la raíz pasa personas (SDD S1.8 §2.4).
    crearModuloUsuarios({
      bd,
      autenticar,
      autorizar,
      personas: { buscarPersonaPorCi, crearPersona, actualizarPersona, buscarIdsPorNombre, obtenerPersonas },
    }),
    crearModuloAuditoria({
      bd,
      autenticar,
      autorizarLectura: autorizar('auditoria', 'leer'),
      describirUsuarios: describir,
    }),
    ...modulosExtra,
  ];
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
