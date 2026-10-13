import { z } from 'zod';

/** Formato único de error (PRD §5), para documentar respuestas en OpenAPI. */
export const esquemaError = z
  .object({
    error: z.object({
      code: z.string().meta({ example: 'VALIDACION' }),
      message: z.string().meta({ example: 'Los datos enviados no son válidos.' }),
      details: z.unknown().optional(),
    }),
  })
  .meta({ id: 'Error', description: 'Formato único de error de la API.' });
