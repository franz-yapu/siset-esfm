import { z } from 'zod';
import { esquemaPagina, esquemaPaginacion } from '@/compartido/http';
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

/** Ingesta (SDD S3.2-S3.4 §2.2). El valorado se valida contra el tipo en el servicio. */
export const esquemaCrearHojaRuta = z
  .strictObject({
    fileId: z.number().int().min(1),
    tipoTramite: z.string().trim().toUpperCase().min(1).max(40).meta({ example: 'HISTORIAL_ACADEMICO' }),
    nroValorado: z
      .string()
      .trim()
      .max(30)
      .nullable()
      .default(null)
      .transform((v) => v || null)
      .meta({ example: '004522' }),
    observacion: z
      .string()
      .trim()
      .max(255)
      .nullable()
      .default(null)
      .transform((v) => v || null),
  })
  .meta({
    id: 'CrearHojaRuta',
    description: 'Trámite de un egresado. El N.º de valorado solo para historial y legalización (D-05).',
  });

export const esquemaFiltrosHojasRuta = z.object({
  /** N.º de trámite, CI o nombre del titular. */
  texto: z.string().trim().min(1).max(80).optional(),
  estado: z.enum(ESTADOS_HOJA_RUTA).optional(),
  tipoTramite: z.string().trim().toUpperCase().min(1).max(40).optional(),
  gestion: z.coerce.number().int().min(2000).max(2100).optional(),
  ...esquemaPaginacion,
});

export type DatosCrearHojaRuta = z.output<typeof esquemaCrearHojaRuta>;
export type FiltrosHojasRuta = z.output<typeof esquemaFiltrosHojasRuta>;
export const esquemasCrearHojaRuta = { body: esquemaCrearHojaRuta };
export const esquemasListarHojasRuta = { query: esquemaFiltrosHojasRuta };

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

export const esquemaFilaHojaRuta = z
  .object({
    nro: z.string(),
    gestion: z.number().int(),
    tipo: z.object({ codigo: z.string(), nombre: z.string() }),
    estado,
    sedeActual: z.string(),
    titular: z.object({ fileId: z.number().int(), nombre: z.string(), ci: z.string() }),
    nroValorado: z.string().nullable(),
    fechaIngreso: z.iso.datetime(),
    fechaCierre: z.iso.datetime().nullable(),
  })
  .meta({ id: 'FilaHojaRuta' });

export type FilaHojaRuta = z.infer<typeof esquemaFilaHojaRuta>;
export const esquemaPaginaHojasRuta = esquemaPagina(esquemaFilaHojaRuta).meta({ id: 'PaginaHojasRuta' });

export const esquemaTipoTramite = z
  .object({ codigo: z.string(), nombre: z.string(), requiereValorado: z.boolean() })
  .meta({ id: 'TipoTramite' });
export type TipoTramite = z.infer<typeof esquemaTipoTramite>;
