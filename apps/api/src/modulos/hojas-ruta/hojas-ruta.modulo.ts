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
  ...deps
}: DependenciasHojasRuta & {
  autenticar: RequestHandler;
  autorizarLectura: RequestHandler;
  /** `autorizar('hojas-ruta', 'crear')`: solo SEC_DIR (DEC-015). */
  autorizarIngesta: RequestHandler;
  sesionDe: (res: Response) => SesionHojaRuta;
}): ModuloHttp {
  return {
    router: crearRutasHojasRuta(crearServicioHojasRuta(deps), autenticar, autorizarLectura, autorizarIngesta, sesionDe),
    openapi: openapiHojasRuta,
  };
}
