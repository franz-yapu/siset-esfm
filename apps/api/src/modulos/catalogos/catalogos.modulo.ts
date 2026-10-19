import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { ClienteBd } from '@/compartido/bd';
import { datosValidos, esquemaError, validar, type ModuloHttp, type ZodOpenApiPathsObject } from '@/compartido/http';
import { obtenerEspecialidades } from './especialidad.repositorio';
import { obtenerRequisitosActivos } from './requisito.repositorio';
import {
  esquemaCrearRequisito,
  esquemaEditarRequisito,
  esquemaIdRequisito,
  esquemaRequisitoAdmin,
  esquemasCrearRequisito,
  esquemasEditarRequisito,
  esquemasUnRequisito,
} from './requisitos-admin.esquemas';
import { crearServicioRequisitosAdmin } from './requisitos-admin.servicio';
import { obtenerModalidadesActivas } from './modalidad.repositorio';
import {
  esquemaCrearModalidad,
  esquemaEditarModalidad,
  esquemaIdModalidad,
  esquemaModalidad,
  esquemaModalidadAdmin,
  esquemasCrearModalidad,
  esquemasEditarModalidad,
  esquemasUnaModalidad,
} from './modalidades-admin.esquemas';
import { crearServicioModalidadesAdmin } from './modalidades-admin.servicio';

/** Para no importar seguridad: la raíz le pasa los middlewares ya armados (ADR-0001). */
export interface DependenciasCatalogos {
  bd: ClienteBd;
  autenticar: RequestHandler;
  /** `autorizar('files', 'leer')`: las pantallas de files usan las especialidades y las modalidades (SDD S2.2 §2.1). */
  autorizarLectura: RequestHandler;
  /** `autorizar('requisitos', 'leer')`: el catálogo de requisitos (SDD S2.4 §2.2). */
  autorizarRequisitos: RequestHandler;
  /** `autorizar('requisitos', 'crear')` y `('requisitos', 'editar')`: Kardex administra el catálogo (DEC-055). */
  autorizarAdminRequisitos: { crear: RequestHandler; editar: RequestHandler };
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
    soloAniosTerminados: z.boolean(),
  })
  .meta({ id: 'RequisitoCatalogo' });

const error = (description: string) => ({ description, content: { 'application/json': { schema: esquemaError } } });
const sinSesion = error('Falta el access token o no es válido (NO_AUTENTICADO).');
const soloKardex = error('Sin permiso (solo Kardex) o con cambio de contraseña pendiente.');
const unRequisito = (description: string) => ({
  description,
  content: { 'application/json': { schema: esquemaRequisitoAdmin } },
});
const accionRequisito = (summary: string, description: string, ok: string, sinCambio: string) => ({
  post: {
    tags: ['Catálogos'],
    summary,
    description,
    security: [{ bearerAuth: [] }],
    requestParams: { path: esquemaIdRequisito },
    responses: {
      '200': unRequisito(ok),
      '401': sinSesion,
      '403': soloKardex,
      '404': error('El requisito no existe (NO_ENCONTRADO).'),
      '422': error(sinCambio),
    },
  },
});

const unaModalidad = (description: string) => ({
  description,
  content: { 'application/json': { schema: esquemaModalidadAdmin } },
});
const accionModalidad = (summary: string, description: string, ok: string, sinCambio: string) => ({
  post: {
    tags: ['Catálogos'],
    summary,
    description,
    security: [{ bearerAuth: [] }],
    requestParams: { path: esquemaIdModalidad },
    responses: {
      '200': unaModalidad(ok),
      '401': sinSesion,
      '403': soloKardex,
      '404': error('La modalidad no existe (NO_ENCONTRADO).'),
      '422': error(sinCambio),
    },
  },
});

const openapiModalidades: ZodOpenApiPathsObject = {
  '/api/v1/catalogos/modalidades': {
    get: {
      tags: ['Catálogos'],
      summary: 'Modalidades de ingreso activas',
      description: 'Las que se ofrecen al registrar un file (DEC-058).',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Modalidades activas, en su orden.',
          content: { 'application/json': { schema: z.array(esquemaModalidad) } },
        },
        '401': sinSesion,
        '403': error('Sin permiso o con cambio de contraseña pendiente.'),
      },
    },
    post: {
      tags: ['Catálogos'],
      summary: 'Agregar una modalidad de ingreso',
      description: 'Kardex agrega una modalidad (DEC-058). El código no se cambia después.',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: esquemaCrearModalidad } } },
      responses: {
        '201': unaModalidad('Modalidad agregada.'),
        '400': error('Datos inválidos (VALIDACION).'),
        '401': sinSesion,
        '403': soloKardex,
        '409': error('Ya existe una modalidad con ese código (MODALIDAD_EXISTENTE).'),
      },
    },
  },
  '/api/v1/catalogos/modalidades/todas': {
    get: {
      tags: ['Catálogos'],
      summary: 'Todas las modalidades, con las dadas de baja',
      description: 'Para la pestaña "Modalidades" de Kardex, con cuántos requisitos la nombran.',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'El catálogo completo.',
          content: { 'application/json': { schema: z.array(esquemaModalidadAdmin) } },
        },
        '401': sinSesion,
        '403': soloKardex,
      },
    },
  },
  '/api/v1/catalogos/modalidades/{id}': {
    patch: {
      tags: ['Catálogos'],
      summary: 'Editar una modalidad',
      description: 'Nombre, descripción y orden. El código no se edita.',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdModalidad },
      requestBody: { content: { 'application/json': { schema: esquemaEditarModalidad } } },
      responses: {
        '200': unaModalidad('Modalidad editada.'),
        '400': error('Datos inválidos o sin campos (VALIDACION).'),
        '401': sinSesion,
        '403': soloKardex,
        '404': error('La modalidad no existe (NO_ENCONTRADO).'),
      },
    },
  },
  '/api/v1/catalogos/modalidades/{id}/baja': accionModalidad(
    'Dar de baja una modalidad',
    'Deja de ofrecerse al registrar un file; los files que la tienen la conservan.',
    'Modalidad dada de baja.',
    'Ya estaba de baja (ESTADO_SIN_CAMBIO).',
  ),
  '/api/v1/catalogos/modalidades/{id}/reactivar': accionModalidad(
    'Reactivar una modalidad',
    'Vuelve a ofrecerse al registrar un file.',
    'Modalidad reactivada.',
    'Ya estaba activa (ESTADO_SIN_CAMBIO).',
  ),
};

const openapiCatalogos: ZodOpenApiPathsObject = {
  ...openapiModalidades,
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
    post: {
      tags: ['Catálogos'],
      summary: 'Agregar un requisito al catálogo',
      description:
        'Kardex agrega un requisito, a todas las modalidades o solo a algunas (DEC-055). El código sale del nombre y va al final del orden.',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: esquemaCrearRequisito } } },
      responses: {
        '201': unRequisito('Requisito agregado.'),
        '400': error('Datos inválidos (VALIDACION).'),
        '401': sinSesion,
        '403': soloKardex,
      },
    },
  },
  '/api/v1/catalogos/requisitos/todos': {
    get: {
      tags: ['Catálogos'],
      summary: 'Todo el catálogo de requisitos, con los dados de baja',
      description: 'Para la pantalla de Kardex "Requisitos por modalidad" (DEC-055).',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'El catálogo completo, en el orden de la hoja del folder.',
          content: { 'application/json': { schema: z.array(esquemaRequisitoAdmin) } },
        },
        '401': sinSesion,
        '403': soloKardex,
      },
    },
  },
  '/api/v1/catalogos/requisitos/{id}': {
    patch: {
      tags: ['Catálogos'],
      summary: 'Editar un requisito del catálogo',
      description:
        'Nombre, descripción, año, si es obligatorio, modalidades, género, curso y orden. "Por gestión" no se edita (DEC-055).',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdRequisito },
      requestBody: { content: { 'application/json': { schema: esquemaEditarRequisito } } },
      responses: {
        '200': unRequisito('Requisito editado.'),
        '400': error('Datos inválidos o sin campos (VALIDACION).'),
        '401': sinSesion,
        '403': soloKardex,
        '404': error('El requisito no existe (NO_ENCONTRADO).'),
      },
    },
  },
  '/api/v1/catalogos/requisitos/{id}/baja': accionRequisito(
    'Dar de baja un requisito',
    'Deja de pedirse y de contar para el semáforo; lo registrado en los files se conserva.',
    'Requisito dado de baja.',
    'Ya estaba de baja (ESTADO_SIN_CAMBIO).',
  ),
  '/api/v1/catalogos/requisitos/{id}/reactivar': accionRequisito(
    'Reactivar un requisito',
    'Vuelve a pedirse; lo que se había registrado antes de la baja reaparece.',
    'Requisito reactivado.',
    'Ya estaba activo (ESTADO_SIN_CAMBIO).',
  ),
};

/**
 * Módulo HTTP de catálogos: especialidades (SDD S2.2) y requisitos y modalidades, que Kardex administra
 * (DEC-055, DEC-058).
 */
export function crearModuloCatalogos({
  bd,
  autenticar,
  autorizarLectura,
  autorizarRequisitos,
  autorizarAdminRequisitos,
}: DependenciasCatalogos): ModuloHttp {
  const admin = crearServicioRequisitosAdmin(bd);
  const modalidadesAdmin = crearServicioModalidadesAdmin(bd);
  const modalidades: RequestHandler = async (_req, res) => {
    res.json(await obtenerModalidadesActivas(bd));
  };
  const todasLasModalidades: RequestHandler = async (_req, res) => {
    res.json(await modalidadesAdmin.listar());
  };
  const agregarModalidad: RequestHandler = async (_req, res) => {
    res.status(201).json(await modalidadesAdmin.crear(datosValidos(res, esquemasCrearModalidad).body));
  };
  const modificarModalidad: RequestHandler = async (_req, res) => {
    const { params, body } = datosValidos(res, esquemasEditarModalidad);
    res.json(await modalidadesAdmin.editar(params.id, body));
  };
  const bajaModalidad: RequestHandler = async (_req, res) => {
    res.json(await modalidadesAdmin.darDeBaja(datosValidos(res, esquemasUnaModalidad).params.id));
  };
  const reactivarModalidad: RequestHandler = async (_req, res) => {
    res.json(await modalidadesAdmin.reactivar(datosValidos(res, esquemasUnaModalidad).params.id));
  };
  const crear = [autenticar, autorizarAdminRequisitos.crear];
  const editar = [autenticar, autorizarAdminRequisitos.editar];
  const todos: RequestHandler = async (_req, res) => {
    res.json(await admin.listar());
  };
  const agregar: RequestHandler = async (_req, res) => {
    res.status(201).json(await admin.crear(datosValidos(res, esquemasCrearRequisito).body));
  };
  const modificar: RequestHandler = async (_req, res) => {
    const { params, body } = datosValidos(res, esquemasEditarRequisito);
    res.json(await admin.editar(params.id, body));
  };
  const baja: RequestHandler = async (_req, res) => {
    res.json(await admin.darDeBaja(datosValidos(res, esquemasUnRequisito).params.id));
  };
  const reactivar: RequestHandler = async (_req, res) => {
    res.json(await admin.reactivar(datosValidos(res, esquemasUnRequisito).params.id));
  };
  const especialidades: RequestHandler = async (_req, res) => {
    res.json(await obtenerEspecialidades(bd));
  };
  const requisitos: RequestHandler = async (_req, res) => {
    res.json(await obtenerRequisitosActivos(bd));
  };
  return {
    router: Router()
      .get('/catalogos/especialidades', autenticar, autorizarLectura, especialidades)
      .get('/catalogos/modalidades', autenticar, autorizarLectura, modalidades)
      .post('/catalogos/modalidades', ...crear, validar(esquemasCrearModalidad), agregarModalidad)
      .get('/catalogos/modalidades/todas', ...crear, todasLasModalidades)
      .patch('/catalogos/modalidades/:id', ...editar, validar(esquemasEditarModalidad), modificarModalidad)
      .post('/catalogos/modalidades/:id/baja', ...editar, validar(esquemasUnaModalidad), bajaModalidad)
      .post('/catalogos/modalidades/:id/reactivar', ...editar, validar(esquemasUnaModalidad), reactivarModalidad)
      .get('/catalogos/requisitos', autenticar, autorizarRequisitos, requisitos)
      .post('/catalogos/requisitos', ...crear, validar(esquemasCrearRequisito), agregar)
      .get('/catalogos/requisitos/todos', ...crear, todos)
      .patch('/catalogos/requisitos/:id', ...editar, validar(esquemasEditarRequisito), modificar)
      .post('/catalogos/requisitos/:id/baja', ...editar, validar(esquemasUnRequisito), baja)
      .post('/catalogos/requisitos/:id/reactivar', ...editar, validar(esquemasUnRequisito), reactivar),
    openapi: openapiCatalogos,
  };
}
