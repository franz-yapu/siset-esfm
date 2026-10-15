import { Router, type RequestHandler, type Response } from 'express';
import { datosValidos, esquemaError, validar, type ZodOpenApiPathsObject } from '@/compartido/http';
import {
  esquemaCrearHojaRuta,
  esquemaDetalleHojaRuta,
  esquemaFiltrosHojasRuta,
  esquemaNroHojaRuta,
  esquemaPaginaHojasRuta,
  esquemasCrearHojaRuta,
  esquemasListarHojasRuta,
  esquemasTransicion,
  esquemasUnaHojaRuta,
  esquemaTransicion,
} from './hojas-ruta.esquemas';
import type { ServicioHojasRuta, SesionHojaRuta } from './hojas-ruta.servicio';

/** `/hojas-ruta/:nro` (SDD S3.1-S3.3 §2.4). Casbin solo exige `hojas-ruta`/`leer`; cada paso lo decide la máquina. */
export function crearRutasHojasRuta(
  servicio: ServicioHojasRuta,
  autenticar: RequestHandler,
  autorizarLectura: RequestHandler,
  autorizarIngesta: RequestHandler,
  sesionDe: (res: Response) => SesionHojaRuta,
): Router {
  const listar: RequestHandler = async (_req, res) => {
    res.json(await servicio.listar(datosValidos(res, esquemasListarHojasRuta).query));
  };
  const crear: RequestHandler = async (_req, res) => {
    res.status(201).json(await servicio.crear(datosValidos(res, esquemasCrearHojaRuta).body, sesionDe(res)));
  };
  const obtener: RequestHandler = async (_req, res) => {
    res.json(await servicio.obtener(datosValidos(res, esquemasUnaHojaRuta).params.nro, sesionDe(res)));
  };
  const transicion: RequestHandler = async (_req, res) => {
    const { params, body } = datosValidos(res, esquemasTransicion);
    res.json(await servicio.transicion(params.nro, body.accion, body.observacion, sesionDe(res)));
  };
  return Router()
    .get('/hojas-ruta', autenticar, autorizarLectura, validar(esquemasListarHojasRuta), listar)
    .post('/hojas-ruta', autenticar, autorizarIngesta, validar(esquemasCrearHojaRuta), crear)
    .get('/hojas-ruta/:nro', autenticar, autorizarLectura, validar(esquemasUnaHojaRuta), obtener)
    .post('/hojas-ruta/:nro/transiciones', autenticar, autorizarLectura, validar(esquemasTransicion), transicion);
}

const error = (description: string) => ({ description, content: { 'application/json': { schema: esquemaError } } });
const comunes = {
  '401': error('Falta el access token o no es válido (NO_AUTENTICADO).'),
  '404': error('La hoja de ruta no existe (NO_ENCONTRADO).'),
};

export const openapiHojasRuta: ZodOpenApiPathsObject = {
  '/api/v1/hojas-ruta': {
    get: {
      tags: ['Hojas de ruta'],
      summary: 'Listar hojas de ruta',
      description: 'Filtros por N.º, CI o nombre del titular, estado, tipo y gestión; más recientes primero; paginado.',
      security: [{ bearerAuth: [] }],
      requestParams: { query: esquemaFiltrosHojasRuta },
      responses: {
        '200': { description: 'Una página.', content: { 'application/json': { schema: esquemaPaginaHojasRuta } } },
        '400': error('Filtros inválidos (VALIDACION).'),
        '401': comunes['401'],
        '403': error('Sin permiso o con cambio de contraseña pendiente.'),
      },
    },
    post: {
      tags: ['Hojas de ruta'],
      summary: 'Registrar un trámite (ingesta)',
      description:
        'Secretaría de Dirección en Calahumana. Genera el N.º HR-AAAA-NNNNNN (ADR-0006) y deja el trámite RECIBIDO. El valorado solo para historial y legalización.',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: esquemaCrearHojaRuta } } },
      responses: {
        '201': {
          description: 'Trámite registrado.',
          content: { 'application/json': { schema: esquemaDetalleHojaRuta } },
        },
        '400': error('Datos inválidos o valorado que no corresponde al tipo (VALIDACION).'),
        '401': comunes['401'],
        '403': error('Solo SEC_DIR desde Calahumana.'),
        '422': error('Tipo o file inexistente, file que no es de un egresado o bloqueado.'),
      },
    },
  },
  '/api/v1/hojas-ruta/{nro}': {
    get: {
      tags: ['Hojas de ruta'],
      summary: 'Ver una hoja de ruta',
      description: 'Con sus movimientos y los pasos que puede hacer quien pregunta (según su rol y su sede).',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaNroHojaRuta },
      responses: {
        '200': { description: 'La hoja de ruta.', content: { 'application/json': { schema: esquemaDetalleHojaRuta } } },
        '400': error('Número inválido (VALIDACION).'),
        ...comunes,
        '403': error('Sin permiso o con cambio de contraseña pendiente.'),
      },
    },
  },
  '/api/v1/hojas-ruta/{nro}/transiciones': {
    post: {
      tags: ['Hojas de ruta'],
      summary: 'Registrar un paso del trámite',
      description:
        'Dos flujos según el valorado (DEC-033). Cada paso lo registra un rol desde una sede (ADR-0005). Deja un movimiento y un evento en la bitácora.',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaNroHojaRuta },
      requestBody: { content: { 'application/json': { schema: esquemaTransicion } } },
      responses: {
        '200': { description: 'Paso registrado.', content: { 'application/json': { schema: esquemaDetalleHojaRuta } } },
        '400': error('Acción desconocida (VALIDACION).'),
        ...comunes,
        '403': error('Ese paso lo registra otro rol u otra sede (PROHIBIDO).'),
        '409': error('El trámite no admite ese paso en su estado o flujo (TRANSICION_INVALIDA).'),
        '422': error('El file del titular está bloqueado (FILE_BLOQUEADO).'),
      },
    },
  },
};
