import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { ClienteBd } from '@/compartido/bd';
import { esquemaError, type ModuloHttp, type ZodOpenApiPathsObject } from '@/compartido/http';
import { obtenerEspecialidades } from './especialidad.repositorio';

/** Para no importar seguridad: la raíz le pasa los middlewares ya armados (ADR-0001). */
export interface DependenciasCatalogos {
  bd: ClienteBd;
  autenticar: RequestHandler;
  /** `autorizar('files', 'leer')`: hoy solo las pantallas de files usan las especialidades (SDD S2.2 §2.1). */
  autorizarLectura: RequestHandler;
}

const esquemaEspecialidad = z
  .object({ id: z.number().int(), nombre: z.string().meta({ example: 'Matemática' }) })
  .meta({ id: 'Especialidad' });

const error = (description: string) => ({ description, content: { 'application/json': { schema: esquemaError } } });

const openapiCatalogos: ZodOpenApiPathsObject = {
  '/api/v1/catalogos/especialidades': {
    get: {
      tags: ['Catálogos'],
      summary: 'Especialidades activas',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Especialidades activas, por nombre.',
          content: { 'application/json': { schema: z.array(esquemaEspecialidad) } },
        },
        '401': error('Falta el access token o no es válido (NO_AUTENTICADO).'),
        '403': error('Sin permiso o con cambio de contraseña pendiente.'),
      },
    },
  },
};

/** Módulo HTTP de catálogos: por ahora, las especialidades (SDD S2.2). */
export function crearModuloCatalogos({ bd, autenticar, autorizarLectura }: DependenciasCatalogos): ModuloHttp {
  const especialidades: RequestHandler = async (_req, res) => {
    res.json(await obtenerEspecialidades(bd));
  };
  return {
    router: Router().get('/catalogos/especialidades', autenticar, autorizarLectura, especialidades),
    openapi: openapiCatalogos,
  };
}
