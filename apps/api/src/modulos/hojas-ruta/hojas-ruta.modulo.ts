import type { RequestHandler, Response } from 'express';
import type { ModuloHttp } from '@/compartido/http';
import { crearRutasHojasRuta, openapiHojasRuta } from './hojas-ruta.rutas';
import { crearServicioHojasRuta, type DependenciasHojasRuta, type SesionHojaRuta } from './hojas-ruta.servicio';

/** Módulo HTTP de hojas de ruta (SDD S3.1-S3.3). La raíz le pasa catálogos, files, personas y la sesión. */
export function crearModuloHojasRuta({
  autenticar,
  autorizarLectura,
  autorizarIngesta,
  sesionDe,
  seguimientoLimitePorMinuto,
  autorizarReportes,
  ...deps
}: DependenciasHojasRuta & {
  autenticar: RequestHandler;
  autorizarLectura: RequestHandler;
  /** `autorizar('hojas-ruta', 'crear')`: SEC_DIR y SEC_COORD (DEC-015, ADR-0011). */
  autorizarIngesta: RequestHandler;
  sesionDe: (res: Response) => SesionHojaRuta;
  /** Consultas públicas por minuto e IP (el mismo límite del login, RNF-10). */
  seguimientoLimitePorMinuto: number;
  /** `autorizar('reportes', 'leer')`: SEC_DIR, COORDINADOR y KARDEX. */
  autorizarReportes: RequestHandler;
}): ModuloHttp {
  return {
    router: crearRutasHojasRuta(
      crearServicioHojasRuta(deps),
      autenticar,
      autorizarLectura,
      autorizarIngesta,
      sesionDe,
      seguimientoLimitePorMinuto,
      autorizarReportes,
    ),
    openapi: openapiHojasRuta,
  };
}
