import { Router } from 'express';
import { esquemaError, type ZodOpenApiPathsObject } from '@/compartido/http';
import { esquemaSalud } from './salud.esquemas';
import type { crearControladorSalud } from './salud.controlador';

export const crearRutasSalud = (controlador: ReturnType<typeof crearControladorSalud>): Router =>
  Router().get('/health', controlador.obtener);

export const openapiSalud: ZodOpenApiPathsObject = {
  '/api/v1/health': {
    get: {
      tags: ['Salud'],
      summary: 'Estado de la API y de la base de datos',
      responses: {
        '200': {
          description: 'La API y la base de datos responden.',
          content: { 'application/json': { schema: esquemaSalud } },
        },
        '503': {
          description: 'La base de datos no responde.',
          content: { 'application/json': { schema: esquemaError } },
        },
      },
    },
  },
};
