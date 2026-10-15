import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { ZodOpenApiResponseObject } from 'zod-openapi';
import { datosValidos, esquemaError, validar, type ZodOpenApiPathsObject } from '@/compartido/http';
import { esquemaIdFile } from './files.esquemas';
import {
  esquemaParamsRequisito,
  esquemaRegistrarRequisito,
  esquemaRequisitoDelFile,
  esquemasListarRequisitos,
  esquemasRegistrarRequisito,
} from './requisitos.esquemas';
import type { ServicioRequisitos } from './requisitos.servicio';

/** `autorizar('requisitos', accion)` ya armado por la raíz (ADR-0001, DEC-015). */
export interface AutorizarRequisitos {
  leer: RequestHandler;
  /** `requisitos`/`leer_propio`: el estudiante, los de su file (S2.7). */
  leerPropio: RequestHandler;
  editar: RequestHandler;
}

/** `/files/:id/requisitos` (SDD S2.4 §2.1): KARDEX registra; SEC_COORD y COORDINADOR leen; SEC_DIR no. */
export function crearRutasRequisitos(
  servicio: ServicioRequisitos,
  autenticar: RequestHandler,
  autorizar: AutorizarRequisitos,
  /** El file de la sesión (lo resuelve el servicio de files). */
  idFilePropio: () => Promise<number>,
): Router {
  const listar: RequestHandler = async (_req, res) => {
    res.json(await servicio.listar(datosValidos(res, esquemasListarRequisitos).params.id));
  };
  const registrar: RequestHandler = async (_req, res) => {
    const { params, body } = datosValidos(res, esquemasRegistrarRequisito);
    res.json(await servicio.registrar(params.id, params.codigo, body));
  };
  const listarPropios: RequestHandler = async (_req, res) => {
    res.json(await servicio.listar(await idFilePropio()));
  };
  return Router()
    .get('/files/mio/requisitos', autenticar, autorizar.leerPropio, listarPropios)
    .get('/files/:id/requisitos', autenticar, autorizar.leer, validar(esquemasListarRequisitos), listar)
    .put('/files/:id/requisitos/:codigo', autenticar, autorizar.editar, validar(esquemasRegistrarRequisito), registrar);
}

const error = (description: string) => ({ description, content: { 'application/json': { schema: esquemaError } } });
const json = (description: string, schema: z.ZodType): ZodOpenApiResponseObject => ({
  description,
  content: { 'application/json': { schema } },
});
const comunes = {
  '401': error('Falta el access token o no es válido (NO_AUTENTICADO).'),
  '403': error('Sin permiso o con cambio de contraseña pendiente.'),
};

export const openapiRequisitos: ZodOpenApiPathsObject = {
  '/api/v1/files/mio/requisitos': {
    get: {
      tags: ['Files'],
      summary: 'Requisitos de mi file (estudiante)',
      description: 'Los requisitos del file de la persona de la sesión (S2.7), sin id en la URL.',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': json('Requisitos de mi file.', z.array(esquemaRequisitoDelFile)),
        ...comunes,
        '404': error('La persona de la sesión no tiene file (NO_ENCONTRADO).'),
      },
    },
  },
  '/api/v1/files/{id}/requisitos': {
    get: {
      tags: ['Files'],
      summary: 'Requisitos del file',
      description: 'El catálogo activo con el estado de cada requisito en el file (sin registro = PENDIENTE).',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdFile },
      responses: {
        '200': json('Requisitos del file.', z.array(esquemaRequisitoDelFile)),
        '400': error('Id inválido (VALIDACION).'),
        ...comunes,
        '404': error('El file no existe (NO_ENCONTRADO).'),
      },
    },
  },
  '/api/v1/files/{id}/requisitos/{codigo}': {
    put: {
      tags: ['Files'],
      summary: 'Registrar un requisito del file (solo Kardex)',
      description:
        'Crea o actualiza el estado del requisito. COMPLETO exige fecha; OBSERVADO, observación (defensa reprobada o no presentada, D-04b).',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaParamsRequisito },
      requestBody: { content: { 'application/json': { schema: esquemaRegistrarRequisito } } },
      responses: {
        '200': json('Requisito registrado.', esquemaRequisitoDelFile),
        '400': error('Datos inválidos (VALIDACION).'),
        ...comunes,
        '404': error('El file o el requisito no existen (NO_ENCONTRADO).'),
      },
    },
  },
};
