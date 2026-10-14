import { z } from 'zod';
import { esquemaPagina, esquemaPaginacion } from '@/compartido/http';

// Contratos de /files (SDD S2.2 §2.2). Los largos son los de las tablas persona y file_academico.

export const CONDICIONES = ['ESTUDIANTE', 'EGRESADO'] as const;

/** El CHECK de la tabla (ck_file_anio): 1990–2100; la API no acepta más allá del año siguiente. */
const ANIO_MIN = 1990;
const anioMax = () => new Date().getFullYear() + 1;

/** Texto opcional: '' o solo espacios cuentan como null. */
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v || null);

const email = z
  .union([z.literal(''), z.email('El correo no tiene un formato válido').max(120)])
  .nullable()
  .transform((v) => v || null);

const fechaNacimiento = z
  .union([z.literal(''), z.iso.date('Fecha con formato AAAA-MM-DD')])
  .nullable()
  .transform((v) => v || null);

const camposEditables = {
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios').max(80),
  apellidoPaterno: textoOpcional(60),
  apellidoMaterno: textoOpcional(60),
  fechaNacimiento,
  email,
  celular: textoOpcional(20),
  /** Texto libre y único hasta conocer el formato de la escuela (DEC-016 #4, D-28). */
  codigo: z.string().trim().min(1, 'El código de estudiante es obligatorio').max(20).meta({ example: 'EST-2024-015' }),
  especialidadId: z.number().int().min(1),
  anioIngreso: z
    .number()
    .int()
    .min(ANIO_MIN, `El año de ingreso va de ${ANIO_MIN} en adelante`)
    .refine((a) => a <= anioMax(), 'El año de ingreso no puede ser posterior al año siguiente'),
  condicion: z.enum(CONDICIONES),
};

const MENSAJE_APELLIDO = 'Debe tener al menos un apellido';

export const esquemaCrearFile = z
  .strictObject({
    ci: z
      .string()
      .trim()
      .regex(/^\d{4,15}$/, 'El CI debe tener de 4 a 15 dígitos')
      .meta({ example: '7654321' }),
    complemento: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{0,5}$/, 'El complemento tiene hasta 5 letras o dígitos')
      .nullable()
      .default('')
      .transform((v) => v ?? ''),
    ...camposEditables,
    apellidoPaterno: camposEditables.apellidoPaterno.default(null),
    apellidoMaterno: camposEditables.apellidoMaterno.default(null),
    fechaNacimiento: camposEditables.fechaNacimiento.default(null),
    email: camposEditables.email.default(null),
    celular: camposEditables.celular.default(null),
    condicion: camposEditables.condicion.default('ESTUDIANTE'),
  })
  .refine((d) => d.apellidoPaterno || d.apellidoMaterno, { message: MENSAJE_APELLIDO, path: ['apellidoPaterno'] })
  .meta({ id: 'CrearFile', description: 'Persona del estudiante y su file. Se crea desbloqueado.' });

/** Sin CI ni complemento (identidad) ni bloqueo (S2.3, D-07b): `strictObject` los rechaza con 400. */
export const esquemaEditarFile = z
  .strictObject(
    Object.fromEntries(Object.entries(camposEditables).map(([k, v]) => [k, v.optional()])) as {
      [K in keyof typeof camposEditables]: z.ZodOptional<(typeof camposEditables)[K]>;
    },
  )
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: 'Envíe al menos un campo para editar' })
  .meta({ id: 'EditarFile', description: 'Solo los campos que cambian. El CI y el bloqueo no se editan aquí.' });

export const esquemaFiltrosFiles = z.object({
  /** En el CI, el código y el nombre, sin distinguir mayúsculas. */
  texto: z.string().trim().min(1).max(80).optional(),
  especialidadId: z.coerce.number().int().min(1).optional(),
  anioIngreso: z.coerce.number().int().min(ANIO_MIN).max(2100).optional(),
  condicion: z.enum(CONDICIONES).optional(),
  bloqueado: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  ...esquemaPaginacion,
});

export const esquemaIdFile = z.object({ id: z.coerce.number().int().min(1).max(2_147_483_647) });

export type DatosCrearFile = z.output<typeof esquemaCrearFile>;
export type CambiosFileApi = z.output<typeof esquemaEditarFile>;
export type FiltrosFiles = z.output<typeof esquemaFiltrosFiles>;

export const esquemasListarFiles = { query: esquemaFiltrosFiles };
export const esquemasUnFile = { params: esquemaIdFile };
export const esquemasCrearFile = { body: esquemaCrearFile };
export const esquemasEditarFile = { params: esquemaIdFile, body: esquemaEditarFile };

export const esquemaFileDetalle = z
  .object({
    id: z.number().int(),
    codigo: z.string(),
    ci: z.string(),
    complemento: z.string(),
    nombres: z.string(),
    apellidoPaterno: z.string().nullable(),
    apellidoMaterno: z.string().nullable(),
    nombre: z.string().meta({ example: 'Juana Mamani Quispe' }),
    fechaNacimiento: z.iso.date().nullable(),
    celular: z.string().nullable(),
    email: z.string().nullable(),
    especialidadId: z.number().int(),
    especialidad: z.string(),
    anioIngreso: z.number().int(),
    condicion: z.enum(CONDICIONES),
    bloqueado: z.boolean(),
    motivoBloqueo: z.string().nullable(),
  })
  .meta({ id: 'FileDetalle', description: 'File académico con los datos de la persona.' });

export type FileDetalle = z.infer<typeof esquemaFileDetalle>;
export const esquemaPaginaFiles = esquemaPagina(esquemaFileDetalle).meta({ id: 'PaginaFiles' });
