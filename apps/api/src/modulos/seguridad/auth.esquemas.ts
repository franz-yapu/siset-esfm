import { z } from 'zod';
import { ACCIONES, RECURSOS } from './autorizacion.politica';
import { esquemaPassword } from './password.esquemas';

// Contrato de POST /auth/login (SDD S1.3 §2.1).

export const esquemaLogin = z
  .object({
    /** CI o CI-complemento (D-14, D-25 provisionales). En mayúsculas para encontrar "1234567-1A" aunque se escriba "1a". */
    usuario: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .transform((v) => v.toUpperCase())
      .meta({ example: '1234567-1A' }),
    /** Sin la política de DEC-011: una contraseña temporal o anterior a la regla tiene que poder entrar. */
    password: z.string().min(1).max(200).meta({ example: 'abc123.!' }),
  })
  .meta({ id: 'Login', description: 'Credenciales: CI (con complemento si lo tiene) y contraseña.' });

export const esquemaUsuarioSesion = z
  .object({
    id: z.number().int(),
    usuario: z.string().meta({ example: '1234567-1A' }),
    nombre: z.string().meta({ example: 'Ana Mamani Quispe' }),
    rol: z.string().meta({ example: 'KARDEX' }),
    sedeId: z.number().int().nullable(),
    activo: z.boolean(),
    debeCambiarPassword: z.boolean(),
    /** El acceso anterior a este, o null si es el primero. */
    ultimoAcceso: z.iso.datetime().nullable(),
  })
  .meta({ id: 'UsuarioSesion', description: 'Usuario que inició sesión.' });

export const esquemaRespuestaLogin = z
  .object({
    accessToken: z.string().meta({ description: 'JWT HS256 de 15 min. Se manda en Authorization: Bearer.' }),
    expiraEn: z.iso.datetime().meta({ description: 'Vencimiento del access token.' }),
    usuario: esquemaUsuarioSesion,
  })
  .meta({ id: 'RespuestaLogin', description: 'Sesión iniciada. El refresh token viaja en la cookie siset_refresh.' });

export type UsuarioSesion = z.infer<typeof esquemaUsuarioSesion>;
export type RespuestaLogin = z.infer<typeof esquemaRespuestaLogin>;

/** Para `validar` y `datosValidos`. */
export const esquemasLogin = { body: esquemaLogin };

/** POST /auth/cambiar-password (SDD S1.5 §2.1). La nueva cumple la política de DEC-011. */
export const esquemaCambiarPassword = z
  .object({
    passwordActual: z.string().min(1).max(200),
    passwordNueva: esquemaPassword.meta({ example: 'nueva.clave-2' }),
  })
  .meta({ id: 'CambiarPassword', description: 'Contraseña actual y nueva (mín. 8, con letras, números y símbolos).' });

export const esquemasCambiarPassword = { body: esquemaCambiarPassword };

/** GET /auth/mis-permisos (SDD S1.6 §2.5): de aquí arma la web su menú. */
export const esquemaMisPermisos = z
  .object({
    rol: z.string().meta({ example: 'KARDEX' }),
    permisos: z.array(z.object({ recurso: z.enum(RECURSOS), accion: z.enum(ACCIONES) })),
  })
  .meta({ id: 'MisPermisos', description: 'Permisos del rol de la sesión, según la política de autorización.' });
