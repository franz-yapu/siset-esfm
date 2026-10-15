import { Router, type RequestHandler, type Response } from 'express';
import { datosValidos, esquemaError, validar, type ZodOpenApiPathsObject } from '@/compartido/http';
import {
  esquemaDetalleHojaRuta,
  esquemaNroHojaRuta,
  esquemaTransicion,
  esquemasTransicion,
  esquemasUnaHojaRuta,
} from './hojas-ruta.esquemas';
import type { ServicioHojasRuta, SesionHojaRuta } from './hojas-ruta.servicio';

/** `/hojas-ruta/:nro` (SDD S3.1-S3.3 §2.4). Casbin solo exige `hojas-ruta`/`leer`; cada paso lo decide la máquina. */
export function crearRutasHojasRuta(
  servicio: ServicioHojasRuta,
  autenticar: RequestHandler,
  autorizarLectura: RequestHandler,
  sesionDe: (res: Response) => SesionHojaRuta,
): Router {
  const obtener: RequestHandler = async (_req, res) => {
    res.json(await servicio.obtener(datosValidos(res, esquemasUnaHojaRuta).params.nro, sesionDe(res)));
  };
  const transicion: RequestHandler = async (_req, res) => {
    const { params, body } = datosValidos(res, esquemasTransicion);
    res.json(await servicio.transicion(params.nro, body.accion, body.observacion, sesionDe(res)));
  };
  return Router()
    .get('/hojas-ruta/:nro', autenticar, autorizarLectura, validar(esquemasUnaHojaRuta), obtener)
    .post('/hojas-ruta/:nro/transiciones', autenticar, autorizarLectura, validar(esquemasTransicion), transicion);
}

const error = (description: string) => ({ description, content: { 'application/json': { schema: esquemaError } } });
const comunes = {
  '401': error('Falta el access token o no es válido (NO_AUTENTICADO).'),
  '404': error('La hoja de ruta no existe (NO_ENCONTRADO).'),
};

export const openapiHojasRuta: ZodOpenApiPathsObject = {
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
