import { z } from 'zod';
import { esquemaPagina, esquemaPaginacion } from '@/compartido/http';

// Contratos de /usuarios (SDD S1.8 §2.2). Los largos son los de la tabla persona.

/** Esta API crea solo cuentas del personal (DEC-020 #1): estudiantes con el file; egresados, nunca (D-08). */
export const ROLES_PERSONAL = ['SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX'] as const;
export type RolPersonal = (typeof ROLES_PERSONAL)[number];

export const ESTADOS_USUARIO = ['ACTIVO', 'INACTIVO', 'BLOQUEADO'] as const;
export type EstadoUsuario = (typeof ESTADOS_USUARIO)[number];

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

const camposEditables = {
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios').max(80),
  apellidoPaterno: textoOpcional(60),
  apellidoMaterno: textoOpcional(60),
  email,
  celular: textoOpcional(20),
  rol: z.enum(ROLES_PERSONAL),
  /** Obligatoria para el personal (D-24). */
  sedeId: z.number().int().min(1),
};

const MENSAJE_APELLIDO = 'Debe tener al menos un apellido';

export const esquemaCrearUsuario = z
  .strictObject({
    ci: z
      .string()
      .trim()
      .regex(/^\d{4,15}$/, 'El CI debe tener de 4 a 15 dígitos')
      .meta({ example: '4567890' }),
    complemento: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{0,5}$/, 'El complemento tiene hasta 5 letras o dígitos')
      .nullable()
      .default('')
      .transform((v) => v ?? '')
      .meta({ example: '1B' }),
    ...camposEditables,
    apellidoPaterno: camposEditables.apellidoPaterno.default(null),
    apellidoMaterno: camposEditables.apellidoMaterno.default(null),
    email: camposEditables.email.default(null),
    celular: camposEditables.celular.default(null),
  })
  .refine((d) => d.apellidoPaterno || d.apellidoMaterno, { message: MENSAJE_APELLIDO, path: ['apellidoPaterno'] })
  .meta({ id: 'CrearUsuario', description: 'Persona y cuenta del personal. La contraseña la genera el sistema.' });

/** El CI y el complemento no se editan (DEC-020 #3): `strictObject` los rechaza con 400. */
export const esquemaEditarUsuario = z
  .strictObject({
    nombres: camposEditables.nombres.optional(),
    apellidoPaterno: camposEditables.apellidoPaterno.optional(),
    apellidoMaterno: camposEditables.apellidoMaterno.optional(),
    email: camposEditables.email.optional(),
    celular: camposEditables.celular.optional(),
    rol: camposEditables.rol.optional(),
    sedeId: camposEditables.sedeId.optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: 'Envíe al menos un campo para editar' })
  .meta({ id: 'EditarUsuario', description: 'Solo los campos que cambian. El CI no se edita.' });

export const esquemaFiltrosUsuarios = z.object({
  /** En el CI o en el nombre, sin distinguir mayúsculas. */
  texto: z.string().trim().min(1).max(80).optional(),
  rol: z.enum(ROLES_PERSONAL).optional(),
  sedeId: z.coerce.number().int().min(1).optional(),
  estado: z.enum(ESTADOS_USUARIO).optional(),
  ...esquemaPaginacion,
});

export const esquemaIdUsuario = z.object({ id: z.coerce.number().int().min(1).max(2_147_483_647) });

export type DatosCrearUsuario = z.output<typeof esquemaCrearUsuario>;
export type CambiosUsuarioApi = z.output<typeof esquemaEditarUsuario>;
export type FiltrosUsuarios = z.output<typeof esquemaFiltrosUsuarios>;

export const esquemasListarUsuarios = { query: esquemaFiltrosUsuarios };
export const esquemasUnUsuario = { params: esquemaIdUsuario };
export const esquemasCrearUsuario = { body: esquemaCrearUsuario };
export const esquemasEditarUsuario = { params: esquemaIdUsuario, body: esquemaEditarUsuario };

export const esquemaUsuarioDetalle = z
  .object({
    id: z.number().int(),
    usuario: z.string().meta({ example: '4567890-1B' }),
    ci: z.string(),
    complemento: z.string(),
    nombres: z.string(),
    apellidoPaterno: z.string().nullable(),
    apellidoMaterno: z.string().nullable(),
    nombre: z.string().meta({ example: 'Rosa Quispe' }),
    email: z.string().nullable(),
    celular: z.string().nullable(),
    rol: z.string(),
    sedeId: z.number().int().nullable(),
    activo: z.boolean(),
    estado: z.enum(ESTADOS_USUARIO),
    bloqueadoHasta: z.iso.datetime().nullable(),
    debeCambiarPassword: z.boolean(),
    ultimoAcceso: z.iso.datetime().nullable(),
  })
  .meta({ id: 'UsuarioDetalle', description: 'Cuenta y datos personales. Nunca trae la contraseña ni su hash.' });

export type UsuarioDetalle = z.infer<typeof esquemaUsuarioDetalle>;

export const esquemaPaginaUsuarios = esquemaPagina(esquemaUsuarioDetalle).meta({ id: 'PaginaUsuarios' });

export const esquemaUsuarioConPassword = z
  .object({
    usuario: esquemaUsuarioDetalle,
    passwordTemporal: z.string().meta({
      description: 'Se muestra una sola vez; obliga a cambiarla en el primer ingreso.',
      example: 'k7#Qm2xP?a9R',
    }),
  })
  .meta({ id: 'UsuarioConPasswordTemporal' });
