import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { ClienteBd } from '@/compartido/bd';
import { esquemaError, type ModuloHttp, type ZodOpenApiPathsObject } from '@/compartido/http';
import { obtenerEspecialidades } from './especialidad.repositorio';
import { obtenerRequisitosActivos } from './requisito.repositorio';

/** Para no importar seguridad: la raíz le pasa los middlewares ya armados (ADR-0001). */
export interface DependenciasCatalogos {
  bd: ClienteBd;
  autenticar: RequestHandler;
  /** `autorizar('files', 'leer')`: hoy solo las pantallas de files usan las especialidades (SDD S2.2 §2.1). */
  autorizarLectura: RequestHandler;
  /** `autorizar('requisitos', 'leer')`: el catálogo de requisitos (SDD S2.4 §2.2). */
  autorizarRequisitos: RequestHandler;
}

const esquemaEspecialidad = z
  .object({ id: z.number().int(), nombre: z.string().meta({ example: 'Matemática' }) })
  .meta({ id: 'Especialidad' });

const esquemaRequisitoCatalogo = z
  .object({
    id: z.number().int(),
    codigo: z.string().meta({ example: 'TACFI_1' }),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    anioFormacion: z.number().int().nullable(),
    nivel: z.enum(['BASICO', 'INTERMEDIO', 'AVANZADO']).nullable(),
    obligatorio: z.boolean(),
    orden: z.number().int(),
    porGestion: z.boolean(),
    pideCurso: z.boolean(),
    soloGenero: z.enum(['FEMENINO', 'MASCULINO']).nullable(),
    soloModalidad: z.string().nullable(),
  })
  .meta({ id: 'RequisitoCatalogo' });

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
  '/api/v1/catalogos/requisitos': {
    get: {
      tags: ['Catálogos'],
      summary: 'Catálogo activo de requisitos del file',
      description: 'Por año de formación (los sin año al final) y código (DEC-016).',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Requisitos activos.',
          content: { 'application/json': { schema: z.array(esquemaRequisitoCatalogo) } },
        },
        '401': error('Falta el access token o no es válido (NO_AUTENTICADO).'),
        '403': error('Sin permiso o con cambio de contraseña pendiente.'),
      },
    },
  },
};

/** Módulo HTTP de catálogos: por ahora, las especialidades (SDD S2.2). */
export function crearModuloCatalogos({
  bd,
  autenticar,
  autorizarLectura,
  autorizarRequisitos,
}: DependenciasCatalogos): ModuloHttp {
  const especialidades: RequestHandler = async (_req, res) => {
    res.json(await obtenerEspecialidades(bd));
  };
  const requisitos: RequestHandler = async (_req, res) => {
    res.json(await obtenerRequisitosActivos(bd));
  };
  return {
    router: Router()
      .get('/catalogos/especialidades', autenticar, autorizarLectura, especialidades)
      .get('/catalogos/requisitos', autenticar, autorizarRequisitos, requisitos),
    openapi: openapiCatalogos,
  };
}
