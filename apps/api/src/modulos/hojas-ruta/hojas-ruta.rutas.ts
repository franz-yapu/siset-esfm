import { z } from 'zod';
import { Router, type RequestHandler, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ErrorDemasiadasPeticiones } from '@/compartido/errores';
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
  esquemaTipoTramite,
  esquemaConsultaSeguimiento,
  esquemaSeguimiento,
  esquemasSeguimiento,
  esquemaFiltrosReporte,
  esquemaReporteHojasRuta,
  esquemasReporte,
  esquemaConsultaTitulares,
  esquemasTitulares,
  esquemaTitularIngesta,
} from './hojas-ruta.esquemas';
import type { ServicioHojasRuta, SesionHojaRuta } from './hojas-ruta.servicio';

/** `/hojas-ruta/:nro` (SDD S3.1-S3.3 §2.4). Casbin solo exige `hojas-ruta`/`leer`; cada paso lo decide la máquina. */
export function crearRutasHojasRuta(
  servicio: ServicioHojasRuta,
  autenticar: RequestHandler,
  autorizarLectura: RequestHandler,
  autorizarIngesta: RequestHandler,
  sesionDe: (res: Response) => SesionHojaRuta,
  seguimientoLimitePorMinuto: number,
  autorizarReportes: RequestHandler,
): Router {
  const reporte: RequestHandler = async (_req, res) => {
    res.json(await servicio.reporte(datosValidos(res, esquemasReporte).query));
  };
  // Pública: frena a quien prueba CI al azar (RNF-10). Va antes de `validar`, como el login.
  const limitar = rateLimit({
    windowMs: 60_000,
    limit: seguimientoLimitePorMinuto,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new ErrorDemasiadasPeticiones()),
  });
  const seguimiento: RequestHandler = async (_req, res) => {
    const { nro, ci } = datosValidos(res, esquemasSeguimiento).body;
    res.json(await servicio.seguimiento(nro, ci));
  };
  const listar: RequestHandler = async (_req, res) => {
    res.json(await servicio.listar(datosValidos(res, esquemasListarHojasRuta).query));
  };
  const crear: RequestHandler = async (_req, res) => {
    res.status(201).json(await servicio.crear(datosValidos(res, esquemasCrearHojaRuta).body, sesionDe(res)));
  };
  const titulares: RequestHandler = async (_req, res) => {
    res.json(await servicio.titulares(datosValidos(res, esquemasTitulares).query.texto));
  };
  const tipos: RequestHandler = async (_req, res) => {
    res.json(await servicio.tipos());
  };
  const obtener: RequestHandler = async (_req, res) => {
    res.json(await servicio.obtener(datosValidos(res, esquemasUnaHojaRuta).params.nro, sesionDe(res)));
  };
  const transicion: RequestHandler = async (_req, res) => {
    const { params, body } = datosValidos(res, esquemasTransicion);
    res.json(await servicio.transicion(params.nro, body.accion, body.observacion, sesionDe(res)));
  };
  return (
    Router()
      .post('/seguimiento', limitar, validar(esquemasSeguimiento), seguimiento)
      .get('/reportes/hojas-ruta', autenticar, autorizarReportes, validar(esquemasReporte), reporte)
      .get('/hojas-ruta', autenticar, autorizarLectura, validar(esquemasListarHojasRuta), listar)
      .post('/hojas-ruta', autenticar, autorizarIngesta, validar(esquemasCrearHojaRuta), crear)
      // Antes de `/:nro`, para que `tipos` no se lea como número de trámite.
      .get('/hojas-ruta/tipos', autenticar, autorizarLectura, tipos)
      .get('/hojas-ruta/titulares', autenticar, autorizarIngesta, validar(esquemasTitulares), titulares)
      .get('/hojas-ruta/:nro', autenticar, autorizarLectura, validar(esquemasUnaHojaRuta), obtener)
      .post('/hojas-ruta/:nro/transiciones', autenticar, autorizarLectura, validar(esquemasTransicion), transicion)
  );
}

const error = (description: string) => ({ description, content: { 'application/json': { schema: esquemaError } } });
const comunes = {
  '401': error('Falta el access token o no es válido (NO_AUTENTICADO).'),
  '404': error('La hoja de ruta no existe (NO_ENCONTRADO).'),
};

export const openapiHojasRuta: ZodOpenApiPathsObject = {
  '/api/v1/reportes/hojas-ruta': {
    get: {
      tags: ['Hojas de ruta'],
      summary: 'Reporte de trámites',
      description:
        'Totales, por estado, por tipo, por mes, tiempo por etapa y detenidos (RF-13). Filtros por fecha de ingreso y tipo.',
      security: [{ bearerAuth: [] }],
      requestParams: { query: esquemaFiltrosReporte },
      responses: {
        '200': { description: 'El reporte.', content: { 'application/json': { schema: esquemaReporteHojasRuta } } },
        '400': error('Filtros inválidos (VALIDACION).'),
        '401': comunes['401'],
        '403': error('Sin permiso `reportes`/`leer`.'),
      },
    },
  },
  '/api/v1/seguimiento': {
    post: {
      tags: ['Hojas de ruta'],
      summary: 'Seguimiento público de un trámite',
      description:
        'Sin sesión (a esta consulta apunta el QR). N.º + CI del titular; solo el nombre y los pasos (RF-09). El mismo 404 si falla cualquiera de los dos.',
      requestBody: { content: { 'application/json': { schema: esquemaConsultaSeguimiento } } },
      responses: {
        '200': {
          description: 'El avance del trámite.',
          content: { 'application/json': { schema: esquemaSeguimiento } },
        },
        '400': error('Datos inválidos (VALIDACION).'),
        '404': error('No hay un trámite con ese N.º y ese CI (NO_ENCONTRADO).'),
        '429': error('Demasiadas consultas desde la misma IP.'),
      },
    },
  },
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
  '/api/v1/hojas-ruta/tipos': {
    get: {
      tags: ['Hojas de ruta'],
      summary: 'Tipos de trámite',
      description: 'Los tipos activos con si llevan N.º de valorado (D-05), ordenados por nombre.',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'El catálogo.',
          content: { 'application/json': { schema: z.array(esquemaTipoTramite) } },
        },
        '401': comunes['401'],
        '403': error('Sin permiso o con cambio de contraseña pendiente.'),
      },
    },
  },
  '/api/v1/hojas-ruta/titulares': {
    get: {
      tags: ['Hojas de ruta'],
      summary: 'Buscar el titular de un trámite',
      description:
        'Hasta 8 egresados por CI o nombre, con lo justo para elegirlo: Secretaría de Dirección no lee files (DEC-054).',
      security: [{ bearerAuth: [] }],
      requestParams: { query: esquemaConsultaTitulares },
      responses: {
        '200': {
          description: 'Los egresados que coinciden.',
          content: { 'application/json': { schema: z.array(esquemaTitularIngesta) } },
        },
        '400': error('Texto de menos de 2 caracteres (VALIDACION).'),
        '401': comunes['401'],
        '403': error('Sin permiso `hojas-ruta`/`crear` (solo SEC_DIR).'),
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
