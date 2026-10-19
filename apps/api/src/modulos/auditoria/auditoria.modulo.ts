import { Router, type RequestHandler } from 'express';
import type { ClienteBd } from '@/compartido/bd';
import { datosValidos, esquemaError, validar, type ModuloHttp, type ZodOpenApiPathsObject } from '@/compartido/http';
import { crearServicioConsultaAuditoria, type DescribirUsuarios } from './auditoria.consulta';
import {
  esquemaFiltrosAuditoria,
  esquemaPaginaAuditoria,
  esquemasConsultaAuditoria,
} from './auditoria.consulta.esquemas';

/** Para no importar seguridad: la raíz le pasa el middleware ya armado (ADR-0001). */
export interface DependenciasAuditoria {
  bd: ClienteBd;
  autenticar: RequestHandler;
  /** `autorizar('auditoria', 'leer')`. */
  autorizarLectura: RequestHandler;
  describirUsuarios: DescribirUsuarios;
}

const error = (description: string) => ({ description, content: { 'application/json': { schema: esquemaError } } });

const openapiAuditoria: ZodOpenApiPathsObject = {
  '/api/v1/auditoria': {
    get: {
      tags: ['Bitácora'],
      summary: 'Consultar la bitácora (solo el Administrador)',
      description: 'Filtros por usuario, módulo, acción, fechas (hora de La Paz, inclusivas) y entidad; paginada.',
      security: [{ bearerAuth: [] }],
      requestParams: { query: esquemaFiltrosAuditoria },
      responses: {
        '200': {
          description: 'Una página de eventos.',
          content: { 'application/json': { schema: esquemaPaginaAuditoria } },
        },
        '400': error('Filtros inválidos (VALIDACION).'),
        '401': error('Falta el access token o no es válido (NO_AUTENTICADO).'),
        '403': error('Sin permiso o con cambio de contraseña pendiente.'),
      },
    },
  },
};

/** Módulo HTTP de la bitácora: `GET /api/v1/auditoria` (SDD S6.4). */
export function crearModuloAuditoria(deps: DependenciasAuditoria): ModuloHttp {
  const servicio = crearServicioConsultaAuditoria(deps.bd, deps.describirUsuarios);
  const listar: RequestHandler = async (_req, res) => {
    const { query } = datosValidos(res, esquemasConsultaAuditoria);
    res.json(await servicio.listar(query));
  };
  return {
    router: Router().get(
      '/auditoria',
      deps.autenticar,
      deps.autorizarLectura,
      validar(esquemasConsultaAuditoria),
      listar,
    ),
    openapi: openapiAuditoria,
  };
}
