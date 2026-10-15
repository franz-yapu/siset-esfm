import { z } from 'zod';
import { ACCIONES_HOJA_RUTA, ESTADOS_HOJA_RUTA } from './maquina';

// Contratos de /hojas-ruta (SDD S3.1-S3.3 §2.4).

export const esquemaNroHojaRuta = z.object({
  nro: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^HR-\d{4}-\d{6}$/, 'Número de trámite con formato HR-AAAA-NNNNNN'),
});

export const esquemaTransicion = z
  .strictObject({
    accion: z.enum(ACCIONES_HOJA_RUTA),
    observacion: z
      .string()
      .trim()
      .max(255)
      .nullable()
      .default(null)
      .transform((v) => v || null),
  })
  .meta({ id: 'TransicionHojaRuta' });

export const esquemasUnaHojaRuta = { params: esquemaNroHojaRuta };
export const esquemasTransicion = { params: esquemaNroHojaRuta, body: esquemaTransicion };

const estado = z.enum(ESTADOS_HOJA_RUTA);

export const esquemaDetalleHojaRuta = z
  .object({
    nro: z.string().meta({ example: 'HR-2026-000015' }),
    gestion: z.number().int(),
    tipo: z.object({ codigo: z.string(), nombre: z.string(), requiereValorado: z.boolean() }),
    estado,
    sedeActual: z.object({ codigo: z.string(), nombre: z.string() }),
    nroValorado: z.string().nullable(),
    fechaIngreso: z.iso.datetime(),
    fechaCierre: z.iso.datetime().nullable(),
    titular: z.object({ fileId: z.number().int(), nombre: z.string(), ci: z.string(), bloqueado: z.boolean() }),
    movimientos: z.array(
      z.object({
        accion: z.string(),
        estadoAnterior: estado.nullable(),
        estadoNuevo: estado,
        sede: z.string(),
        usuario: z.object({ id: z.number().int(), nombre: z.string() }),
        observacion: z.string().nullable(),
        fecha: z.iso.datetime(),
      }),
    ),
    acciones: z.array(
      z.object({ accion: z.enum(ACCIONES_HOJA_RUTA), etiqueta: z.string(), deshabilitada: z.string().nullable() }),
    ),
  })
  .meta({
    id: 'DetalleHojaRuta',
    description: 'Hoja de ruta con sus movimientos y los pasos que puede hacer quien pregunta.',
  });

export type DetalleHojaRuta = z.infer<typeof esquemaDetalleHojaRuta>;
