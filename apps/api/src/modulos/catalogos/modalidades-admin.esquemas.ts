import { z } from 'zod';

// Catálogo de modalidades de ingreso que administra Kardex (DEC-058). El código no se edita.

export const esquemaCodigoModalidad = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{1,10}$/, 'El código lleva solo letras y números, hasta 10 (por ejemplo, B4)');

const nombre = z.string().trim().min(2, 'El nombre necesita al menos 2 caracteres').max(80);
const descripcion = z.string().trim().max(255).nullable();

export const esquemaCrearModalidad = z
  .strictObject({ codigo: esquemaCodigoModalidad, nombre, descripcion: descripcion.default(null) })
  .meta({ id: 'CrearModalidad' });

export const esquemaEditarModalidad = z
  .strictObject({
    nombre: nombre.optional(),
    descripcion: descripcion.optional(),
    orden: z.number().int().min(1).max(999).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Envíe al menos un campo')
  .meta({ id: 'EditarModalidad' });

export const esquemaIdModalidad = z.object({ id: z.coerce.number().int().min(1) });

export const esquemaModalidad = z
  .object({
    id: z.number().int(),
    codigo: z.string().meta({ example: 'B1' }),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    orden: z.number().int(),
    activo: z.boolean(),
  })
  .meta({ id: 'ModalidadIngreso' });

export const esquemaModalidadAdmin = esquemaModalidad
  .extend({ requisitos: z.number().int().meta({ description: 'Requisitos activos que la nombran en su lista.' }) })
  .meta({ id: 'ModalidadIngresoAdmin' });

export type DatosCrearModalidad = z.infer<typeof esquemaCrearModalidad>;
export type CambiosModalidad = z.infer<typeof esquemaEditarModalidad>;
export type ModalidadAdmin = z.infer<typeof esquemaModalidadAdmin>;

export const esquemasCrearModalidad = { body: esquemaCrearModalidad };
export const esquemasEditarModalidad = { params: esquemaIdModalidad, body: esquemaEditarModalidad };
export const esquemasUnaModalidad = { params: esquemaIdModalidad };
