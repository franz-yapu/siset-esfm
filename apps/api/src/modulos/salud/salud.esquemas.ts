import { z } from 'zod';

export const esquemaSalud = z
  .object({
    estado: z.literal('ok'),
    bd: z.literal('ok'),
    version: z.string().meta({ example: '0.1.0' }),
  })
  .meta({ id: 'Salud', description: 'Estado de la API y de su base de datos.' });

export type Salud = z.infer<typeof esquemaSalud>;
