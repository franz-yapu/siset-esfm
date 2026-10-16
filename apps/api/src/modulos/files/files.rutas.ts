import { Router, type RequestHandler } from 'express';
import type { z } from 'zod';
import type { ZodOpenApiResponseObject } from 'zod-openapi';
import { esquemaError, validar, type ZodOpenApiPathsObject } from '@/compartido/http';
import type { crearControladorFiles } from './files.controlador';
import { recibirPdfResolucion } from './pdf-resolucion';
import {
  esquemaBloqueo,
  esquemaFormularioBloqueo,
  esquemaCrearFile,
  esquemaEditarFile,
  esquemaFileDetalle,
  esquemaFiltrosFiles,
  esquemaIdFile,
  esquemaPaginaFiles,
  esquemasBloquearFile,
  esquemasCrearFile,
  esquemasDesbloquearFile,
  esquemasEditarFile,
  esquemasListarFiles,
  esquemasUnFile,
} from './files.esquemas';

/** `autorizar('files', accion)` ya armado por la raíz: files no importa a seguridad (ADR-0001). */
export interface AutorizarFiles {
  leer: RequestHandler;
  /** `files`/`leer_propio`: el estudiante, solo su file (S2.7). */
  leerPropio: RequestHandler;
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
    .get('/files/mio', autenticar, autorizar.leerPropio, controlador.mio)
    .get('/files/:id', autenticar, autorizar.leer, validar(esquemasUnFile), controlador.obtener)
    .post('/files', autenticar, autorizar.crear, validar(esquemasCrearFile), controlador.crear)
    .patch('/files/:id', autenticar, autorizar.editar, validar(esquemasEditarFile), controlador.editar)
    .get('/files/:id/bloqueo', autenticar, autorizar.leer, validar(esquemasUnFile), controlador.bloqueo)
    .get('/files/:id/bloqueo/pdf', autenticar, autorizar.leer, validar(esquemasUnFile), controlador.pdfBloqueo)
    .post(
      '/files/:id/bloqueo',
      autenticar,
      autorizar.editar,
      recibirPdfResolucion,
      validar(esquemasBloquearFile),
      controlador.bloquear,
    )
    .post(
      '/files/:id/desbloqueo',
      autenticar,
      autorizar.editar,
      validar(esquemasDesbloquearFile),
      controlador.desbloquear,
    );

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
  '/api/v1/files/mio': {
    get: {
      tags: ['Files'],
      summary: 'Ver mi file (estudiante)',
      description: 'El file de la persona de la sesión (S2.7). No recibe id: nadie lee otro file cambiando la URL.',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': json('Mi file.', esquemaFileDetalle),
        ...comunes,
        '404': error('La persona de la sesión no tiene file (NO_ENCONTRADO).'),
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
  '/api/v1/files/{id}/bloqueo': {
    get: {
      tags: ['Files'],
      summary: 'Ver el bloqueo abierto del file',
      description:
        'La causa, la resolución y quién bloqueó, sin el PDF. `null` si el file no está bloqueado o se bloqueó antes de DEC-049.',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdFile },
      responses: {
        '200': json('El bloqueo abierto o null.', esquemaBloqueo.nullable()),
        ...comunes,
        '404': error('El file no existe (NO_ENCONTRADO).'),
      },
    },
    post: {
      tags: ['Files'],
      summary: 'Bloquear un file (solo Kardex)',
      description:
        'Por licencia temporal obligatoria o voluntaria (D-29, DEC-049), con el número, la fecha y la glosa de la resolución y su PDF (hasta 5 MB). La glosa queda como motivo del file.',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdFile },
      requestBody: { content: { 'multipart/form-data': { schema: esquemaFormularioBloqueo } } },
      responses: {
        '200': json('File bloqueado.', esquemaFileDetalle),
        '400': error('Faltan datos, la fecha es futura o el PDF falta, pesa más de 5 MB o no es un PDF (VALIDACION).'),
        ...comunes,
        '404': error('El file no existe (NO_ENCONTRADO).'),
        '422': error('Ya estaba bloqueado (ESTADO_SIN_CAMBIO).'),
      },
    },
  },
  '/api/v1/files/{id}/bloqueo/pdf': {
    get: {
      tags: ['Files'],
      summary: 'Descargar el PDF de la resolución del bloqueo abierto',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdFile },
      responses: {
        '200': {
          description: 'El PDF.',
          content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
        },
        ...comunes,
        '404': error('El file no existe o no tiene resolución registrada (NO_ENCONTRADO).'),
      },
    },
  },
  '/api/v1/files/{id}/desbloqueo': {
    post: {
      tags: ['Files'],
      summary: 'Desbloquear un file (solo Kardex)',
      description:
        'Sin datos (DEC-049 #4): quién desbloquea y cuándo quedan en el bloqueo y en la bitácora. Cuerpo vacío o `{}`.',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdFile },
      responses: {
        '200': json('File desbloqueado.', esquemaFileDetalle),
        '400': error('Campos desconocidos en el cuerpo (VALIDACION).'),
        ...comunes,
        '404': error('El file no existe (NO_ENCONTRADO).'),
        '422': error('No estaba bloqueado (ESTADO_SIN_CAMBIO).'),
      },
    },
  },
};
