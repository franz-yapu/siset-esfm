import type { ModuloHttp } from '@/compartido/http';
import { crearControladorAuth } from './auth.controlador';
import { crearAutenticar } from './autenticar';
import { crearRutasAuth, openapiAuth } from './auth.rutas';
import { crearServicioAuth, type DependenciasAuth } from './auth.servicio';
import { crearCaptcha } from './captcha';

/** Módulo HTTP de sesión: login, refresh, logout y cambio de contraseña (SDD S1.3, S1.5). */
export function crearModuloAuth({
  loginLimitePorMinuto,
  captchaTrasFallos,
  ...deps
}: DependenciasAuth & { loginLimitePorMinuto: number; captchaTrasFallos: number }): ModuloHttp {
  const captcha = crearCaptcha({ jwtSecreto: deps.jwtSecreto, trasFallos: captchaTrasFallos });
  return {
    router: crearRutasAuth(
      crearControladorAuth(crearServicioAuth(deps), captcha),
      loginLimitePorMinuto,
      crearAutenticar(deps.jwtSecreto),
      captcha.reto,
    ),
    openapi: openapiAuth,
  };
}
