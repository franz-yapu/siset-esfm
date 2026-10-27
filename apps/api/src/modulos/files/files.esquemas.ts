import { z } from 'zod';
import { esquemaPagina, esquemaPaginacion } from '@/compartido/http';
import { COLORES_SEMAFORO } from './semaforo';

// Contratos de /files (SDD S2.2 §2.2). Los largos son los de las tablas persona y file_academico.

export const CONDICIONES = ['ESTUDIANTE', 'EGRESADO'] as const;
export const GENEROS = ['FEMENINO', 'MASCULINO'] as const;
/** Modalidades de ingreso (D-45): no es lo mismo A, B1, B2 y B3. */

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
  /** La edita también el estudiante (ADR-0013). */
  direccion: textoOpcional(200),
  /**
   * Único y en texto libre (DEC-016 #4). El de la escuela (D-28c): 209 (UA Ancocagua) + iniciales + fecha de
   * nacimiento (DDMMAA) + 00, por ejemplo 209-AUM05030000; se escribe como en la matrícula.
   */
  codigo: z
    .string()
    .trim()
    .min(1, 'El código de estudiante es obligatorio')
    .max(20)
    .meta({ example: '209-AUM05030000' }),
  especialidadId: z.number().int().min(1),
  anioIngreso: z
    .number()
    .int()
    .min(ANIO_MIN, `El año de ingreso va de ${ANIO_MIN} en adelante`)
    .refine((a) => a <= anioMax(), 'El año de ingreso no puede ser posterior al año siguiente'),
  condicion: z.enum(CONDICIONES),
  /** Cabecera del folder personal (DEC-051): deciden qué requisitos se piden y cuáles están atrasados. */
  genero: z.enum(GENEROS).nullable(),
  /** Código del catálogo de modalidades (DEC-058; lo valida el servicio). En mayúsculas: "b1" vale como B1. */
  modalidad: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,10}$/, 'Elija la modalidad de ingreso')
    .nullable(),
  anioFormacion: z
    .number()
    .int()
    .min(1, 'El año de formación va de 1 a 5')
    .max(5, 'El año de formación va de 1 a 5')
    .nullable(),
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
    direccion: camposEditables.direccion.default(null),
    condicion: camposEditables.condicion.default('ESTUDIANTE'),
    genero: camposEditables.genero.default(null),
    modalidad: camposEditables.modalidad.default(null),
    anioFormacion: camposEditables.anioFormacion.default(null),
  })
  .refine((d) => d.apellidoPaterno || d.apellidoMaterno, { message: MENSAJE_APELLIDO, path: ['apellidoPaterno'] })
  // D-45: el estudiante se registra con su modalidad de ingreso; a un egresado se le puede no conocer.
  .refine((d) => d.condicion !== 'ESTUDIANTE' || d.modalidad, {
    message: 'Elija la modalidad de ingreso (A, B1, B2 o B3)',
    path: ['modalidad'],
  })
  // DEC-064 #4: la fecha de nacimiento es la contraseña inicial del estudiante.
  .refine((d) => d.condicion !== 'ESTUDIANTE' || d.fechaNacimiento, {
    message: 'La fecha de nacimiento es obligatoria para un estudiante: es su contraseña inicial',
    path: ['fechaNacimiento'],
  })
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
  /** Calculado (SDD S2.5): se filtra después de calcularlo. */
  semaforo: z.enum(COLORES_SEMAFORO).optional(),
  ...esquemaPaginacion,
});

/** Las dos causas de bloqueo que nombró la escuela (D-29, DEC-049). */
export const CAUSAS_BLOQUEO = ['LICENCIA_OBLIGATORIA', 'LICENCIA_VOLUNTARIA'] as const;

/** La fecha de hoy en Bolivia (UTC−4, sin horario de verano), como AAAA-MM-DD. */
export const hoyEnLaPaz = () => new Date(Date.now() - 4 * 60 * 60_000).toISOString().slice(0, 10);

/**
 * Bloqueo con la resolución que lo respalda (D-29, DEC-049). Llega como `multipart/form-data`: estos son los
 * campos de texto; el PDF va en el campo `pdf` y lo revisa `recibirPdfResolucion`.
 */
export const esquemaBloquearFile = z
  .strictObject({
    causa: z.enum(CAUSAS_BLOQUEO, 'Elija la causa del bloqueo'),
    nroResolucion: z
      .string('Escriba el número de la resolución')
      .trim()
      .min(1, 'Escriba el número de la resolución')
      .max(100)
      .meta({ example: 'RA-045/2026' }),
    fechaResolucion: z.iso
      .date('Fecha con formato AAAA-MM-DD')
      .refine((f) => f <= hoyEnLaPaz(), 'La fecha de la resolución no puede ser futura'),
    glosa: z
      .string('Escriba la glosa con el motivo')
      .trim()
      .min(5, 'Escriba la glosa con el motivo')
      .max(255)
      .meta({ example: 'Licencia temporal obligatoria por reprobación, gestión 2026' }),
  })
  .meta({ id: 'BloquearFile' });

/** Formulario del bloqueo en OpenAPI: los campos de texto más el PDF. */
export const esquemaFormularioBloqueo = esquemaBloquearFile
  .extend({ pdf: z.string().meta({ format: 'binary', description: 'PDF de la resolución, hasta 5 MB.' }) })
  .meta({ id: 'FormularioBloqueo' });

/** El desbloqueo no pide datos (DEC-049 #4): quién y cuándo los pone la API. Cuerpo vacío o `{}`. */
export const esquemaDesbloquearFile = z.strictObject({}).optional().meta({ id: 'DesbloquearFile' });

export const esquemaIdFile = z.object({ id: z.coerce.number().int().min(1).max(2_147_483_647) });

export type DatosCrearFile = z.output<typeof esquemaCrearFile>;
export type CambiosFileApi = z.output<typeof esquemaEditarFile>;
export type FiltrosFiles = z.output<typeof esquemaFiltrosFiles>;

export const esquemasListarFiles = { query: esquemaFiltrosFiles };
export const esquemasUnFile = { params: esquemaIdFile };
export const esquemasCrearFile = { body: esquemaCrearFile };
export const esquemasEditarFile = { params: esquemaIdFile, body: esquemaEditarFile };
export const esquemasBloquearFile = { params: esquemaIdFile, body: esquemaBloquearFile };
export const esquemasDesbloquearFile = { params: esquemaIdFile, body: esquemaDesbloquearFile };

export type DatosBloqueo = z.output<typeof esquemaBloquearFile>;

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
    direccion: z.string().nullable(),
    /** Cuándo cambió la foto, o null si no tiene (ADR-0013). Se lee aparte: `GET /files/{id}/foto`. */
    foto: z.iso.datetime().nullable(),
    especialidadId: z.number().int(),
    especialidad: z.string(),
    anioIngreso: z.number().int(),
    condicion: z.enum(CONDICIONES),
    genero: z.enum(GENEROS).nullable(),
    modalidad: z.string().nullable().meta({ example: 'B1' }),
    anioFormacion: z.number().int().nullable(),
    bloqueado: z.boolean(),
    motivoBloqueo: z.string().nullable(),
    /** Calculado, no se guarda (SDD S2.5, DEC-031). `null` en el egresado: no se le piden requisitos (DEC-060). */
    semaforo: z.enum(COLORES_SEMAFORO).nullable(),
  })
  .meta({ id: 'FileDetalle', description: 'File académico con los datos de la persona.' });

export type FileDetalle = z.infer<typeof esquemaFileDetalle>;
export const esquemaPaginaFiles = esquemaPagina(esquemaFileDetalle).meta({ id: 'PaginaFiles' });

export const esquemaBloqueo = z
  .object({
    causa: z.enum(CAUSAS_BLOQUEO),
    nroResolucion: z.string(),
    fechaResolucion: z.iso.date(),
    glosa: z.string(),
    pdfNombre: z.string().meta({ example: 'RA-045-2026.pdf' }),
    bloqueadoEn: z.iso.datetime(),
    bloqueadoPor: z.object({ id: z.number().int(), nombre: z.string() }).nullable(),
  })
  .meta({ id: 'Bloqueo', description: 'El bloqueo abierto del file, sin el PDF.' });

export type Bloqueo = z.infer<typeof esquemaBloqueo>;

/** Importación desde Excel (DEC-064 #3): hasta 2000 filas; cada una con los campos de "Nuevo file". */
export const MAX_FILAS_IMPORTACION = 2000;

export const esquemaImportarFiles = z
  .strictObject({
    /** false: solo revisa y dice qué haría. true: lo aplica todo junto, o nada si alguna fila tiene errores. */
    aplicar: z.boolean().default(false),
    /** Cada fila se valida aparte con `CrearFile`, para informar los errores fila por fila. */
    filas: z.array(z.unknown()).min(1, 'El archivo no tiene filas').max(MAX_FILAS_IMPORTACION),
  })
  .meta({ id: 'ImportarFiles' });

export const esquemasImportarFiles = { body: esquemaImportarFiles };

export const ACCIONES_IMPORTACION = ['CREAR', 'ACTUALIZAR', 'SIN_CAMBIOS', 'ERROR'] as const;
export const RESULTADOS_CUENTA = ['CREADA', 'EXISTENTE', 'REACTIVADA', 'USUARIO_OCUPADO', 'DESACTIVADA'] as const;

export const esquemaResultadoImportacion = z
  .object({
    aplicado: z.boolean(),
    resumen: z.object({
      crear: z.number().int(),
      actualizar: z.number().int(),
      sinCambios: z.number().int(),
      errores: z.number().int(),
    }),
    filas: z.array(
      z.object({
        /** N.º de fila de datos, desde 1 (sin el encabezado). */
        fila: z.number().int(),
        ci: z.string().nullable(),
        nombre: z.string().nullable(),
        accion: z.enum(ACCIONES_IMPORTACION),
        /** Qué campos cambian al actualizar. */
        cambios: z.array(z.string()),
        errores: z.array(z.object({ campo: z.string(), mensaje: z.string() })),
        /** Solo al aplicar: qué pasó con la cuenta del estudiante. */
        cuenta: z.enum(RESULTADOS_CUENTA).nullable(),
      }),
    ),
  })
  .meta({ id: 'ResultadoImportacion' });

export type ResultadoImportacion = z.infer<typeof esquemaResultadoImportacion>;
export type FilaImportacion = ResultadoImportacion['filas'][number];

/** POST /files: el file y qué pasó con la cuenta del estudiante (null en el egresado, que no tiene). */
export const esquemaFileCreado = esquemaFileDetalle
  .extend({ cuentaEstudiante: z.enum(['CREADA', 'EXISTENTE', 'REACTIVADA', 'USUARIO_OCUPADO']).nullable() })
  .meta({ id: 'FileCreado' });

/** Lo que el estudiante cambia de su file (ADR-0013): solo contacto. Cualquier otro campo da 400. */
export const esquemaEditarMio = z
  .strictObject({
    email: camposEditables.email.optional(),
    celular: camposEditables.celular.optional(),
    direccion: camposEditables.direccion.optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: 'Envíe al menos un campo para editar' })
  .meta({ id: 'EditarMiFile', description: 'Correo, celular y dirección del estudiante de la sesión.' });

export const esquemasEditarMio = { body: esquemaEditarMio };
