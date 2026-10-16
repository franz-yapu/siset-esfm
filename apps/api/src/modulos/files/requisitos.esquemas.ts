import { z } from 'zod';
import { esquemaIdFile, hoyEnLaPaz } from './files.esquemas';

// Requisitos del file (SDD S2.4 §2.1, D-04, D-04b).

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

export const esquemaRequisitoDelFile = z
  .object({
    codigo: z.string().meta({ example: 'TCLO_BASICO' }),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    anioFormacion: z.number().int().nullable(),
    nivel: z.enum(['BASICO', 'INTERMEDIO', 'AVANZADO']).nullable(),
    obligatorio: z.boolean(),
    estado: z.enum(ESTADOS_REQUISITO),
    fecha: z.iso.date().nullable(),
    nroDocumento: z.string().nullable(),
    observacion: z.string().nullable(),
    registradoPor: z.object({ id: z.number().int(), nombre: z.string() }).nullable(),
    actualizado: z.iso.datetime().nullable(),
  })
  .meta({
    id: 'RequisitoDelFile',
    description: 'Un requisito del catálogo con su estado en el file (sin registro = PENDIENTE).',
  });

export type RequisitoDelFile = z.infer<typeof esquemaRequisitoDelFile>;
