import type { RequestHandler } from 'express';
import { Router } from 'express';
import type { ModuloHttp } from '@/compartido/http';
import { crearControladorFiles } from './files.controlador';
import { crearRutasFiles, openapiFiles, type AutorizarFiles } from './files.rutas';
import { crearServicioFiles, type DependenciasFiles } from './files.servicio';
import { crearRutasRequisitos, openapiRequisitos, type AutorizarRequisitos } from './requisitos.rutas';
import { crearServicioRequisitos, type DependenciasRequisitos } from './requisitos.servicio';

/**
 * Módulo HTTP de files (SDD S2.2, S2.4). La raíz le pasa personas, especialidades, el catálogo de requisitos,
 * quién es cada usuario y los middlewares.
 */
export function crearModuloFiles({
  autenticar,
  autorizar,
  autorizarRequisitos,
  obtenerRequisitosActivos,
  describirUsuarios,
  ...deps
}: Omit<DependenciasFiles, 'obtenerRequisitosActivos'> &
  Omit<DependenciasRequisitos, 'bd'> & {
    autenticar: RequestHandler;
    autorizar: AutorizarFiles;
    autorizarRequisitos: AutorizarRequisitos;
  }): ModuloHttp {
  const requisitos = crearServicioRequisitos({ bd: deps.bd, obtenerRequisitosActivos, describirUsuarios });
  return {
    router: Router()
      .use(
        crearRutasFiles(
          crearControladorFiles(crearServicioFiles({ ...deps, obtenerRequisitosActivos })),
          autenticar,
          autorizar,
        ),
      )
      .use(crearRutasRequisitos(requisitos, autenticar, autorizarRequisitos)),
    openapi: { ...openapiFiles, ...openapiRequisitos },
  };
}
