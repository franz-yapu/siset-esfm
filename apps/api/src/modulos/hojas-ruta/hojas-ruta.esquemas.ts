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

/** Consulta pública (RF-09 CA2-CA3, S4.1): N.º + CI en el cuerpo, para que el CI no quede en la URL ni en los logs. */
export const esquemaConsultaSeguimiento = z
  .strictObject({
    nro: esquemaNroHojaRuta.shape.nro,
    ci: z.string().trim().min(4).max(20).meta({ example: '6098765' }),
  })
  .meta({ id: 'ConsultaSeguimiento' });
export const esquemasSeguimiento = { body: esquemaConsultaSeguimiento };

/** Sin datos personales más allá del nombre (RF-09 CA3) ni quién hizo cada paso. */
export const esquemaSeguimiento = z
  .object({
    nro: z.string(),
    tipo: z.string(),
    estado,
    sedeActual: z.string(),
    fechaIngreso: z.iso.datetime(),
    fechaCierre: z.iso.datetime().nullable(),
    titular: z.string(),
    pasos: z.array(z.object({ estado, sede: z.string(), fecha: z.iso.datetime() })),
  })
  .meta({ id: 'Seguimiento' });
export type Seguimiento = z.infer<typeof esquemaSeguimiento>;

/** Reporte de trámites (RF-13, S6.1-S6.2). Fechas de ingreso AAAA-MM-DD, en La Paz. */
const fechaDia = z.iso.date();
export const esquemaFiltrosReporte = z.object({
  desde: fechaDia.optional(),
  hasta: fechaDia.optional(),
  tipoTramite: z.string().trim().toUpperCase().min(1).max(40).optional(),
});
export type FiltrosReporte = z.output<typeof esquemaFiltrosReporte>;
export const esquemasReporte = { query: esquemaFiltrosReporte };

export const esquemaReporteHojasRuta = z
  .object({
    total: z.number().int(),
    enCurso: z.number().int(),
    entregados: z.number().int(),
    /** Días promedio de ingreso a entrega; null si no hay entregados. */
    tiempoPromedioDias: z.number().nullable(),
    porEstado: z.array(z.object({ estado, total: z.number().int() })),
    porTipo: z.array(z.object({ codigo: z.string(), nombre: z.string(), total: z.number().int() })),
    /** Ingresados por mes (AAAA-MM), los últimos 6 meses. */
    porMes: z.array(z.object({ mes: z.string(), total: z.number().int() })),
    /** Días promedio que los trámites pasaron en cada estado (solo los que ya salieron de él). */
    porEtapa: z.array(z.object({ estado, dias: z.number() })),
    /** En curso y sin movimiento hace más de `HORAS_DETENIDO` (72) horas, los más quietos primero (D-44). */
    detenidos: z.array(
      z.object({
        nro: z.string(),
        titular: z.string(),
        estado,
        sedeActual: z.string(),
        horas: z.number().int(),
        dias: z.number().int(),
      }),
    ),
  })
  .meta({ id: 'ReporteHojasRuta' });
export type ReporteHojasRuta = z.infer<typeof esquemaReporteHojasRuta>;
