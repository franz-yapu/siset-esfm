import type { ModuloHttp } from '@/compartido/http';
import { crearControladorAuth } from './auth.controlador';
import { crearRutasAuth, openapiAuth } from './auth.rutas';
import { crearServicioAuth, type DependenciasAuth } from './auth.servicio';

/** Módulo HTTP de sesión: `POST /api/v1/auth/login` (SDD S1.3). */
export function crearModuloAuth({
  loginLimitePorMinuto,
  ...deps
}: DependenciasAuth & { loginLimitePorMinuto: number }): ModuloHttp {
  return {
    router: crearRutasAuth(crearControladorAuth(crearServicioAuth(deps)), loginLimitePorMinuto),
    openapi: openapiAuth,
  };
}
