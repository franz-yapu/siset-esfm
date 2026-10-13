import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ErrorDemasiadasPeticiones } from '@/compartido/errores';
import { esquemaError, validar, type ZodOpenApiPathsObject } from '@/compartido/http';
import {
  esquemaCambiarPassword,
  esquemaLogin,
  esquemaRespuestaLogin,
  esquemasCambiarPassword,
  esquemasLogin,
} from './auth.esquemas';
import type { crearControladorAuth } from './auth.controlador';

/**
 * N peticiones por minuto por IP (RNF-10, SDD S1.4 §2.3). Va antes de `validar`: también
 * cuentan las peticiones mal formadas. En memoria: hay una sola instancia de la API.
 */
const limitarLogin = (limitePorMinuto: number): RequestHandler =>
  rateLimit({
    windowMs: 60_000,
    limit: limitePorMinuto,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new ErrorDemasiadasPeticiones()),
  });

export const crearRutasAuth = (
  controlador: ReturnType<typeof crearControladorAuth>,
  limitePorMinuto: number,
  autenticar: RequestHandler,
): Router =>
  Router()
    .post('/auth/login', limitarLogin(limitePorMinuto), validar(esquemasLogin), controlador.login)
    .post('/auth/refresh', controlador.refrescar)
    .post('/auth/logout', controlador.logout)
    // Su propio conteo del rate limit: frena a quien prueba contraseñas actuales con un token robado.
    .post(
      '/auth/cambiar-password',
      limitarLogin(limitePorMinuto),
      autenticar,
      validar(esquemasCambiarPassword),
      controlador.cambiarPassword,
    );

const error = (description: string) => ({ description, content: { 'application/json': { schema: esquemaError } } });

export const openapiAuth: ZodOpenApiPathsObject = {
  '/api/v1/auth/login': {
    post: {
      tags: ['Sesión'],
      summary: 'Iniciar sesión con CI y contraseña',
      description:
        'Devuelve el access token (15 min) y deja el refresh token en la cookie httpOnly `siset_refresh` (8 h, Path=/api/v1/auth).',
      requestBody: { content: { 'application/json': { schema: esquemaLogin } } },
      responses: {
        '200': {
          description: 'Sesión iniciada.',
          headers: {
            'Set-Cookie': { description: 'siset_refresh=…; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth' },
          },
          content: { 'application/json': { schema: esquemaRespuestaLogin } },
        },
        '400': error('Datos inválidos (VALIDACION).'),
        '429': error('Más de 10 intentos por minuto desde la misma IP (DEMASIADAS_PETICIONES).'),
        '401': error(
          'CI o contraseña incorrectos (CREDENCIALES_INVALIDAS): misma respuesta si la cuenta no existe, está inactiva o bloqueada.',
        ),
      },
    },
  },
  '/api/v1/auth/refresh': {
    post: {
      tags: ['Sesión'],
      summary: 'Renovar el access token con la cookie del refresh',
      description:
        'Rota el refresh (el viejo queda revocado; el nuevo hereda el vencimiento de 8 h desde el login). Reusar un refresh ya rotado cierra todas las sesiones del usuario.',
      responses: {
        '200': {
          description: 'Sesión renovada (mismo cuerpo que el login) y cookie nueva.',
          content: { 'application/json': { schema: esquemaRespuestaLogin } },
        },
        '401': error('Sin cookie, refresh inexistente, vencido, reusado o usuario inactivo (SESION_INVALIDA).'),
      },
    },
  },
  '/api/v1/auth/logout': {
    post: {
      tags: ['Sesión'],
      summary: 'Cerrar sesión',
      description: 'Revoca el refresh de la cookie y la borra. Responde 204 aunque no haya sesión.',
      responses: { '204': { description: 'Sesión cerrada.' } },
    },
  },
  '/api/v1/auth/cambiar-password': {
    post: {
      tags: ['Sesión'],
      summary: 'Cambiar la propia contraseña',
      description:
        'Exige el access token. Cierra todas las sesiones y devuelve una nueva sin la obligación de cambiarla.',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: esquemaCambiarPassword } } },
      responses: {
        '200': {
          description: 'Contraseña cambiada; sesión nueva (mismo cuerpo que el login).',
          content: { 'application/json': { schema: esquemaRespuestaLogin } },
        },
        '400': error('La nueva no cumple la política o es igual a la actual (VALIDACION).'),
        '401': error('Falta el access token o no es válido (NO_AUTENTICADO).'),
        '422': error('La contraseña actual no es correcta (PASSWORD_ACTUAL_INCORRECTA).'),
        '429': error('Más de 10 intentos por minuto desde la misma IP (DEMASIADAS_PETICIONES).'),
      },
    },
  },
};
