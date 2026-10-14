import type { RequestHandler } from 'express';
import type { ModuloHttp } from '@/compartido/http';
import { crearControladorFiles } from './files.controlador';
import { crearRutasFiles, openapiFiles, type AutorizarFiles } from './files.rutas';
import { crearServicioFiles, type DependenciasFiles } from './files.servicio';

/** Módulo HTTP de files (SDD S2.2). La raíz le pasa personas, especialidades y los middlewares. */
export function crearModuloFiles({
  autenticar,
  autorizar,
  ...deps
}: DependenciasFiles & { autenticar: RequestHandler; autorizar: AutorizarFiles }): ModuloHttp {
  return {
    router: crearRutasFiles(crearControladorFiles(crearServicioFiles(deps)), autenticar, autorizar),
    openapi: openapiFiles,
  };
}
