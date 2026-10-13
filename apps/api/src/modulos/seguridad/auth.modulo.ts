import type { ModuloHttp } from '@/compartido/http';
import { crearControladorAuth } from './auth.controlador';
import { crearAutenticar } from './autenticar';
import { crearRutasAuth, openapiAuth } from './auth.rutas';
import { crearServicioAuth, type DependenciasAuth } from './auth.servicio';

/** Módulo HTTP de sesión: login, refresh, logout y cambio de contraseña (SDD S1.3, S1.5). */
export function crearModuloAuth({
  loginLimitePorMinuto,
  ...deps
}: DependenciasAuth & { loginLimitePorMinuto: number }): ModuloHttp {
  return {
    router: crearRutasAuth(
      crearControladorAuth(crearServicioAuth(deps)),
      loginLimitePorMinuto,
      crearAutenticar(deps.jwtSecreto),
    ),
    openapi: openapiAuth,
  };
}
