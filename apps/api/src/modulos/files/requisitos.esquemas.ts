import { z } from 'zod';
import { esquemaIdFile, hoyEnLaPaz } from './files.esquemas';

// Requisitos del file (SDD S2.4 §2.1, D-04, D-04b; folder personal, DEC-051).

export const ESTADOS_REQUISITO = ['PENDIENTE', 'COMPLETO', 'OBSERVADO'] as const;

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v || null);

export const esquemaRegistrarRequisito = z
  .strictObject({
    estado: z.enum(ESTADOS_REQUISITO),
    fecha: z.iso
      .date('Fecha con formato AAAA-MM-DD')
      .refine((f) => f <= hoyEnLaPaz(), 'La fecha no puede ser futura')
      .nullable()
      .default(null),
    nroDocumento: textoOpcional(40).default(null),
    /** La defensa reprobada o no presentada (D-04b) se anota aquí con estado OBSERVADO. */
    observacion: textoOpcional(255).default(null),
    /** Solo en los requisitos por gestión (matrícula, certificado de notas): "I/2025", "II/2025" o "2023". */
    gestion: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^((I|II)\/)?\d{4}$/, 'Gestión con formato I/2025, II/2025 o 2023')
      .nullable()
      .default(null)
      .meta({ example: 'II/2025' }),
    /** Solo en los TACFI (DEC-051). */
    nombreCurso: textoOpcional(150).default(null),
    entidadEmisora: textoOpcional(150).default(null),
  })
  .refine((d) => d.estado !== 'COMPLETO' || d.fecha, {
    message: 'Un requisito completo necesita la fecha',
    path: ['fecha'],
  })
  .refine((d) => d.estado !== 'OBSERVADO' || d.observacion, {
    message: 'Escriba la observación (por ejemplo, defensa reprobada o no presentada)',
    path: ['observacion'],
  })
  .meta({
    id: 'RegistrarRequisito',
    description: 'Estado de un requisito en el file. COMPLETO exige fecha; OBSERVADO, observación.',
  });

export const esquemaParamsRequisito = esquemaIdFile.extend({
  codigo: z.string().trim().toUpperCase().min(1).max(30),
});

export type DatosRequisito = z.output<typeof esquemaRegistrarRequisito>;

export const esquemasListarRequisitos = { params: esquemaIdFile };
export const esquemasRegistrarRequisito = { params: esquemaParamsRequisito, body: esquemaRegistrarRequisito };

const quien = z.object({ id: z.number().int(), nombre: z.string() }).nullable();

export const esquemaRegistroDeGestion = z
  .object({
    gestion: z.string().meta({ example: 'II/2025' }),
    estado: z.enum(ESTADOS_REQUISITO),
    fecha: z.iso.date().nullable(),
    nroDocumento: z.string().nullable(),
    observacion: z.string().nullable(),
    registradoPor: quien,
    actualizado: z.iso.datetime(),
  })
  .meta({ id: 'RegistroDeGestion' });

export type RegistroDeGestion = z.infer<typeof esquemaRegistroDeGestion>;

export const esquemaRequisitoDelFile = z
  .object({
    codigo: z.string().meta({ example: 'TACFI_1' }),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    anioFormacion: z.number().int().nullable(),
    nivel: z.enum(['BASICO', 'INTERMEDIO', 'AVANZADO']).nullable(),
    obligatorio: z.boolean(),
    orden: z.number().int(),
    porGestion: z.boolean(),
    pideCurso: z.boolean(),
    soloGenero: z.enum(['FEMENINO', 'MASCULINO']).nullable(),
    soloModalidad: z.string().nullable(),
    /** Se le pide a este file según su género y modalidad (ADR-0007). */
    aplica: z.boolean(),
    /** De un año que el estudiante ya pasó y sin completar (D-31). */
    atrasado: z.boolean(),
    /** En un requisito por gestión, el resumen de sus gestiones (ADR-0007). */
    estado: z.enum(ESTADOS_REQUISITO),
    fecha: z.iso.date().nullable(),
    nroDocumento: z.string().nullable(),
    observacion: z.string().nullable(),
    nombreCurso: z.string().nullable(),
    entidadEmisora: z.string().nullable(),
    registradoPor: quien,
    actualizado: z.iso.datetime().nullable(),
    /** Solo en los requisitos por gestión; vacío en los demás. */
    gestiones: z.array(esquemaRegistroDeGestion),
  })
  .meta({
    id: 'RequisitoDelFile',
    description:
      'Un requisito del catálogo con su estado en el file (sin registro = PENDIENTE). Los por gestión traen cada gestión en `gestiones`.',
  });

export type RequisitoDelFile = z.infer<typeof esquemaRequisitoDelFile>;
