import type { RequestHandler } from 'express';
import type { ModuloHttp } from '@/compartido/http';
import type { Autorizar } from './autorizar';
import { crearControladorUsuarios } from './usuarios.controlador';
import { crearRutasUsuarios, openapiUsuarios } from './usuarios.rutas';
import { crearServicioUsuarios, type DependenciasUsuarios } from './usuarios.servicio';

/** Módulo HTTP de usuarios del personal (SDD S1.8). La raíz le pasa las funciones de personas. */
export function crearModuloUsuarios({
  autenticar,
  autorizar,
  ...deps
}: DependenciasUsuarios & { autenticar: RequestHandler; autorizar: Autorizar }): ModuloHttp {
  return {
    router: crearRutasUsuarios(crearControladorUsuarios(crearServicioUsuarios(deps)), autenticar, autorizar),
    openapi: openapiUsuarios,
  };
}
