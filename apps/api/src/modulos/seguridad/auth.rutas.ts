import { Router } from 'express';
import { esquemaError, validar, type ZodOpenApiPathsObject } from '@/compartido/http';
import { esquemaLogin, esquemaRespuestaLogin, esquemasLogin } from './auth.esquemas';
import type { crearControladorAuth } from './auth.controlador';

export const crearRutasAuth = (controlador: ReturnType<typeof crearControladorAuth>): Router =>
  Router().post('/auth/login', validar(esquemasLogin), controlador.login);

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
        '401': error(
          'CI o contraseña incorrectos (CREDENCIALES_INVALIDAS): misma respuesta si la cuenta no existe, está inactiva o bloqueada.',
        ),
      },
    },
  },
};
