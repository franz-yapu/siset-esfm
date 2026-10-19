import { z } from 'zod';
import { esquemaCodigoModalidad } from './modalidades-admin.esquemas';

// Administración del catálogo de requisitos por Kardex (DEC-055). Las modalidades son códigos del catálogo
// `modalidad_ingreso` (DEC-058): una lista vacía o nula quiere decir "todas".

const nombre = z.string().trim().min(3, 'El nombre necesita al menos 3 caracteres').max(120);
const descripcion = z.string().trim().max(255).nullable();
const anioFormacion = z.number().int().min(1).max(5).nullable();
const modalidades = z
  .array(esquemaCodigoModalidad)
  .max(20)
  .nullable()
  .meta({ description: 'Modalidades a las que se pide; vacío o nulo = todas.', example: ['B1'] });
const soloGenero = z.enum(['FEMENINO', 'MASCULINO']).nullable();

export const esquemaCrearRequisito = z
  .strictObject({
    nombre,
    descripcion: descripcion.default(null),
    anioFormacion: anioFormacion.default(null),
    obligatorio: z.boolean().default(true),
    modalidades: modalidades.default(null),
    soloGenero: soloGenero.default(null),
    porGestion: z.boolean().default(false),
    soloAniosTerminados: z.boolean().default(false),
    pideCurso: z.boolean().default(false),
  })
  .refine((d) => d.porGestion || !d.soloAniosTerminados, {
    path: ['soloAniosTerminados'],
    message: 'Solo un requisito por gestión puede contar únicamente los años terminados',
  })
  .meta({ id: 'CrearRequisito' });

/** Por gestión y años terminados no se editan: cambiarían cómo se leen los registros que ya hay. */
export const esquemaEditarRequisito = z
  .strictObject({
    nombre: nombre.optional(),
    descripcion: descripcion.optional(),
    anioFormacion: anioFormacion.optional(),
    obligatorio: z.boolean().optional(),
    modalidades: modalidades.optional(),
    soloGenero: soloGenero.optional(),
    pideCurso: z.boolean().optional(),
    orden: z.number().int().min(1).max(999).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Envíe al menos un campo')
  .meta({ id: 'EditarRequisito' });

export const esquemaIdRequisito = z.object({ id: z.coerce.number().int().min(1) });

export const esquemaRequisitoAdmin = z
  .object({
    id: z.number().int(),
    codigo: z.string(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    anioFormacion: z.number().int().nullable(),
    obligatorio: z.boolean(),
    orden: z.number().int(),
    porGestion: z.boolean(),
    soloAniosTerminados: z.boolean(),
    pideCurso: z.boolean(),
    soloGenero: z.enum(['FEMENINO', 'MASCULINO']).nullable(),
    modalidades: z.array(z.string()).meta({ description: 'Códigos de modalidad; vacío = todas.' }),
    activo: z.boolean(),
  })
  .meta({ id: 'RequisitoAdmin' });

export type DatosCrearRequisito = z.infer<typeof esquemaCrearRequisito>;
export type CambiosRequisito = z.infer<typeof esquemaEditarRequisito>;
export type RequisitoAdmin = z.infer<typeof esquemaRequisitoAdmin>;

export const esquemasCrearRequisito = { body: esquemaCrearRequisito };
export const esquemasEditarRequisito = { params: esquemaIdRequisito, body: esquemaEditarRequisito };
export const esquemasUnRequisito = { params: esquemaIdRequisito };
