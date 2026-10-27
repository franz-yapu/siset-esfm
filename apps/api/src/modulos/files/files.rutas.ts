import express, { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { ZodOpenApiResponseObject } from 'zod-openapi';
import { esquemaError, validar, type ZodOpenApiPathsObject } from '@/compartido/http';
import type { crearControladorFiles } from './files.controlador';
import { recibirPdfResolucion } from './pdf-resolucion';
import { recibirFoto } from './foto';
import {
  esquemaBloqueo,
  esquemaFormularioBloqueo,
  esquemaCrearFile,
  esquemaEditarFile,
  esquemaEditarMio,
  esquemaFileCreado,
  esquemaFileDetalle,
  esquemaFiltrosFiles,
  esquemaIdFile,
  esquemaPaginaFiles,
  esquemaImportarFiles,
  esquemaResultadoImportacion,
  esquemasImportarFiles,
  esquemasBloquearFile,
  esquemasCrearFile,
  esquemasDesbloquearFile,
  esquemasEditarFile,
  esquemasEditarMio,
  esquemasListarFiles,
  esquemasUnFile,
} from './files.esquemas';

/** `autorizar('files', accion)` ya armado por la raíz: files no importa a seguridad (ADR-0001). */
export interface AutorizarFiles {
  leer: RequestHandler;
  /** `files`/`leer_propio`: el estudiante, solo su file (S2.7). */
  leerPropio: RequestHandler;
  /** `files`/`editar_propio`: el estudiante, su contacto y su foto (ADR-0013). */
  editarPropio: RequestHandler;
  crear: RequestHandler;
  editar: RequestHandler;
}

/** La única ruta con otro límite de cuerpo: 2000 filas del Excel (DEC-064 #3). La raíz la saltea en su parser. */
export const RUTA_IMPORTACION_FILES = '/api/v1/files/importacion';
const jsonImportacion = express.json({ limit: '2mb' });

/** `/files` (SDD S2.2 §2.1, DEC-015): KARDEX crea y edita; el personal lee. */
export const crearRutasFiles = (
  controlador: ReturnType<typeof crearControladorFiles>,
  autenticar: RequestHandler,
  autorizar: AutorizarFiles,
): Router =>
  Router()
    .get('/files', autenticar, autorizar.leer, validar(esquemasListarFiles), controlador.listar)
    .get('/files/mio', autenticar, autorizar.leerPropio, controlador.mio)
    // ADR-0013: "mío" antes de ":id"; el file sale de la sesión.
    .patch('/files/mio', autenticar, autorizar.editarPropio, validar(esquemasEditarMio), controlador.editarMio)
    .get('/files/mio/foto', autenticar, autorizar.leerPropio, controlador.miFoto)
    .put('/files/mio/foto', autenticar, autorizar.editarPropio, recibirFoto, controlador.guardarMiFoto)
    .delete('/files/mio/foto', autenticar, autorizar.editarPropio, controlador.quitarMiFoto)
    .get('/files/:id/foto', autenticar, autorizar.leer, validar(esquemasUnFile), controlador.foto)
    .put('/files/:id/foto', autenticar, autorizar.editar, validar(esquemasUnFile), recibirFoto, controlador.guardarFoto)
    .delete('/files/:id/foto', autenticar, autorizar.editar, validar(esquemasUnFile), controlador.quitarFoto)
    .get('/files/:id', autenticar, autorizar.leer, validar(esquemasUnFile), controlador.obtener)
    .post('/files', autenticar, autorizar.crear, validar(esquemasCrearFile), controlador.crear)
    // Crea y actualiza: la usa Kardex, que tiene los dos permisos. El cuerpo se lee solo después de autorizar.
    .post(
      '/files/importacion',
      autenticar,
      autorizar.crear,
      autorizar.editar,
      jsonImportacion,
      validar(esquemasImportarFiles),
      controlador.importar,
    )
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

const foto = {
  description: 'La foto (image/jpeg, image/png o image/webp).',
  content: { 'image/jpeg': { schema: z.string().meta({ format: 'binary' }) } },
};
const formularioFoto = {
  content: {
    'multipart/form-data': {
      schema: z.object({ foto: z.string().meta({ format: 'binary', description: 'JPG, PNG o WebP, hasta 1 MB.' }) }),
    },
  },
};

/** ADR-0013: el estudiante cambia su contacto y su foto; Kardex, la foto de cualquier file. */
const openapiFotos: ZodOpenApiPathsObject = {
  '/api/v1/files/mio/foto': {
    get: {
      tags: ['Files'],
      summary: 'Mi foto (estudiante)',
      security: [{ bearerAuth: [] }],
      responses: { '200': foto, ...comunes, '404': error('No tiene foto o no tiene file (NO_ENCONTRADO).') },
    },
    put: {
      tags: ['Files'],
      summary: 'Cambiar mi foto (estudiante)',
      security: [{ bearerAuth: [] }],
      requestBody: formularioFoto,
      responses: {
        '200': json('Mi file, con la fecha de la foto.', esquemaFileDetalle),
        '400': error('Falta la foto, pesa más de 1 MB o no es JPG, PNG ni WebP (VALIDACION).'),
        ...comunes,
      },
    },
    delete: {
      tags: ['Files'],
      summary: 'Quitar mi foto (estudiante)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': json('Mi file, sin foto.', esquemaFileDetalle),
        ...comunes,
        '422': error('No tenía foto (ESTADO_SIN_CAMBIO).'),
      },
    },
  },
  '/api/v1/files/{id}/foto': {
    get: {
      tags: ['Files'],
      summary: 'Foto del file',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdFile },
      responses: { '200': foto, ...comunes, '404': error('El file no existe o no tiene foto (NO_ENCONTRADO).') },
    },
    put: {
      tags: ['Files'],
      summary: 'Cambiar la foto del file (solo Kardex)',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdFile },
      requestBody: formularioFoto,
      responses: {
        '200': json('El file, con la fecha de la foto.', esquemaFileDetalle),
        '400': error('Falta la foto, pesa más de 1 MB o no es JPG, PNG ni WebP (VALIDACION).'),
        ...comunes,
        '404': error('El file no existe (NO_ENCONTRADO).'),
      },
    },
    delete: {
      tags: ['Files'],
      summary: 'Quitar la foto del file (solo Kardex)',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdFile },
      responses: {
        '200': json('El file, sin foto.', esquemaFileDetalle),
        ...comunes,
        '404': error('El file no existe (NO_ENCONTRADO).'),
        '422': error('No tenía foto (ESTADO_SIN_CAMBIO).'),
      },
    },
  },
};

export const openapiFiles: ZodOpenApiPathsObject = {
  ...openapiFotos,
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
        'Crea la persona del estudiante y su file en una transacción. Si el CI ya es de una persona sin file, la reutiliza sin cambiar sus datos. Un estudiante queda con su cuenta: usuario = CI, contraseña inicial = fecha de nacimiento dd-mm-aaaa, a cambiar en el primer ingreso (DEC-064).',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: esquemaCrearFile } } },
      responses: {
        '201': json('File creado, con el resultado de la cuenta del estudiante.', esquemaFileCreado),
        '400': error('Datos inválidos (VALIDACION).'),
        ...comunes,
        '409': error('La persona ya tiene file (FILE_EXISTENTE) o el código se repite (CODIGO_EXISTENTE).'),
        '422': error('La especialidad no existe (ESPECIALIDAD_INEXISTENTE).'),
      },
    },
  },
  '/api/v1/files/importacion': {
    post: {
      tags: ['Files'],
      summary: 'Importar files desde el Excel (solo Kardex)',
      description:
        'Cada fila con los campos de "Nuevo file": crea el file o, si el CI ya tiene uno, lo actualiza. Con `aplicar: false` solo revisa y dice qué haría; con `true` escribe todo en una transacción, o nada si alguna fila tiene errores. Los estudiantes quedan con su cuenta; los egresados, sin cuenta activa (DEC-064). Hasta 2000 filas y 2 MB.',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: esquemaImportarFiles } } },
      responses: {
        '200': json('Qué pasa (o pasó) con cada fila.', esquemaResultadoImportacion),
        '400': error('El cuerpo no tiene filas o tiene más de 2000 (VALIDACION).'),
        ...comunes,
        '413': error('Más de 2 MB.'),
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
    patch: {
      tags: ['Files'],
      summary: 'Cambiar mi correo, celular o dirección (estudiante)',
      description: 'Solo esos tres campos (ADR-0013); cualquier otro da 400. El resto lo cambia Kardex.',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: esquemaEditarMio } } },
      responses: {
        '200': json('Mi file actualizado.', esquemaFileDetalle),
        '400': error('Datos inválidos o un campo que no se puede cambiar (VALIDACION).'),
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
