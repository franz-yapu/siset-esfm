import { Router, type RequestHandler } from 'express';
import type { z } from 'zod';
import type { ZodOpenApiResponseObject } from 'zod-openapi';
import { esquemaError, validar, type ZodOpenApiPathsObject } from '@/compartido/http';
import type { crearControladorFiles } from './files.controlador';
import {
  esquemaCrearFile,
  esquemaEditarFile,
  esquemaFileDetalle,
  esquemaFiltrosFiles,
  esquemaIdFile,
  esquemaPaginaFiles,
  esquemasCrearFile,
  esquemasEditarFile,
  esquemasListarFiles,
  esquemasUnFile,
} from './files.esquemas';

/** `autorizar('files', accion)` ya armado por la raíz: files no importa a seguridad (ADR-0001). */
export interface AutorizarFiles {
  leer: RequestHandler;
  crear: RequestHandler;
  editar: RequestHandler;
}

/** `/files` (SDD S2.2 §2.1, DEC-015): KARDEX crea y edita; el personal lee. */
export const crearRutasFiles = (
  controlador: ReturnType<typeof crearControladorFiles>,
  autenticar: RequestHandler,
  autorizar: AutorizarFiles,
): Router =>
  Router()
    .get('/files', autenticar, autorizar.leer, validar(esquemasListarFiles), controlador.listar)
    .get('/files/:id', autenticar, autorizar.leer, validar(esquemasUnFile), controlador.obtener)
    .post('/files', autenticar, autorizar.crear, validar(esquemasCrearFile), controlador.crear)
    .patch('/files/:id', autenticar, autorizar.editar, validar(esquemasEditarFile), controlador.editar);

const error = (description: string) => ({ description, content: { 'application/json': { schema: esquemaError } } });
const json = (description: string, schema: z.ZodType): ZodOpenApiResponseObject => ({
  description,
  content: { 'application/json': { schema } },
});
const comunes = {
  '401': error('Falta el access token o no es válido (NO_AUTENTICADO).'),
  '403': error('Sin permiso o con cambio de contraseña pendiente.'),
};

export const openapiFiles: ZodOpenApiPathsObject = {
  '/api/v1/files': {
    get: {
      tags: ['Files'],
      summary: 'Buscar files',
      description:
        'Filtros por texto (CI, código o nombre), especialidad, año de ingreso, condición y bloqueo; paginado.',
      security: [{ bearerAuth: [] }],
      requestParams: { query: esquemaFiltrosFiles },
      responses: {
        '200': json('Una página de files.', esquemaPaginaFiles),
        '400': error('Filtros inválidos (VALIDACION).'),
        ...comunes,
      },
    },
    post: {
      tags: ['Files'],
      summary: 'Registrar un file (solo Kardex)',
      description:
        'Crea la persona del estudiante y su file en una transacción. Si el CI ya es de una persona sin file, la reutiliza sin cambiar sus datos.',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: esquemaCrearFile } } },
      responses: {
        '201': json('File creado.', esquemaFileDetalle),
        '400': error('Datos inválidos (VALIDACION).'),
        ...comunes,
        '409': error('La persona ya tiene file (FILE_EXISTENTE) o el código se repite (CODIGO_EXISTENTE).'),
        '422': error('La especialidad no existe (ESPECIALIDAD_INEXISTENTE).'),
      },
    },
  },
  '/api/v1/files/{id}': {
    get: {
      tags: ['Files'],
      summary: 'Ver un file',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdFile },
      responses: {
        '200': json('El file.', esquemaFileDetalle),
        '400': error('Id inválido (VALIDACION).'),
        ...comunes,
        '404': error('El file no existe (NO_ENCONTRADO).'),
      },
    },
    patch: {
      tags: ['Files'],
      summary: 'Editar un file (solo Kardex)',
      description: 'Solo los campos enviados. El CI y el bloqueo no se editan aquí.',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdFile },
      requestBody: { content: { 'application/json': { schema: esquemaEditarFile } } },
      responses: {
        '200': json('File editado.', esquemaFileDetalle),
        '400': error('Datos inválidos, sin campos, o con el CI o el bloqueo (VALIDACION).'),
        ...comunes,
        '404': error('El file no existe (NO_ENCONTRADO).'),
        '409': error('El código se repite (CODIGO_EXISTENTE).'),
        '422': error('La especialidad no existe (ESPECIALIDAD_INEXISTENTE).'),
      },
    },
  },
};
