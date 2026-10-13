import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ErrorDemasiadasPeticiones } from '@/compartido/errores';
import { esquemaError, validar, type ZodOpenApiPathsObject } from '@/compartido/http';
import { esquemaLogin, esquemaRespuestaLogin, esquemasLogin } from './auth.esquemas';
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

export const crearRutasAuth = (controlador: ReturnType<typeof crearControladorAuth>, limitePorMinuto: number): Router =>
  Router().post('/auth/login', limitarLogin(limitePorMinuto), validar(esquemasLogin), controlador.login);

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
};
