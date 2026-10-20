import type { DatosCrearUsuario } from '@/types/usuarios';
import { esRolPersonal } from '@/types/usuarios';
import { erroresDeFormulario, type ErroresDeFormulario } from './formularios';

// Reglas del formulario de usuarios (SDD S1.13 §2.6). Repiten las de
// apps/api/src/modulos/seguridad/usuarios.esquemas.ts con los mismos mensajes:
// son una ayuda; la que manda es la validación de la API.

export type CampoUsuario = keyof DatosCrearUsuario;
export type ErroresUsuario = Partial<Record<CampoUsuario, string>>;

const CAMPOS: readonly CampoUsuario[] = [
  'ci',
  'complemento',
  'nombres',
  'apellidoPaterno',
  'apellidoMaterno',
  'email',
  'celular',
  'rol',
  'sedeId',
];

const textoONulo = (v: string | null | undefined): string | null => v?.trim() || null;

/** Quita espacios, pasa el complemento a mayúsculas y deja `null` lo vacío (como la API). */
export const normalizarDatosUsuario = (d: DatosCrearUsuario): DatosCrearUsuario => ({
  ci: d.ci.trim(),
  complemento: (d.complemento ?? '').trim().toUpperCase(),
  nombres: d.nombres.trim(),
  apellidoPaterno: textoONulo(d.apellidoPaterno),
  apellidoMaterno: textoONulo(d.apellidoMaterno),
  email: textoONulo(d.email),
  celular: textoONulo(d.celular),
  rol: d.rol,
  sedeId: d.sedeId,
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Devuelve un mensaje por campo con error; vacío si todo está bien. Espera datos normalizados. */
export function validarDatosUsuario(d: DatosCrearUsuario): ErroresUsuario {
  const e: ErroresUsuario = {};
  if (!/^\d{4,15}$/.test(d.ci)) e.ci = 'El CI debe tener de 4 a 15 dígitos';
  if (!/^[A-Z0-9]{0,5}$/.test(d.complemento)) e.complemento = 'El complemento tiene hasta 5 letras o dígitos';
  if (!d.nombres) e.nombres = 'Los nombres son obligatorios';
  else if (d.nombres.length > 80) e.nombres = 'Máximo 80 caracteres';
  if (!d.apellidoPaterno && !d.apellidoMaterno) e.apellidoPaterno = 'Debe tener al menos un apellido';
  if ((d.apellidoPaterno?.length ?? 0) > 60) e.apellidoPaterno = 'Máximo 60 caracteres';
  if ((d.apellidoMaterno?.length ?? 0) > 60) e.apellidoMaterno = 'Máximo 60 caracteres';
  if (d.email && (!EMAIL.test(d.email) || d.email.length > 120)) e.email = 'El correo no tiene un formato válido';
  if ((d.celular?.length ?? 0) > 20) e.celular = 'Máximo 20 caracteres';
  if (!esRolPersonal(d.rol)) e.rol = 'Elija un rol del personal';
  if (!Number.isInteger(d.sedeId) || d.sedeId < 1) e.sedeId = 'Elija una sede';
  return e;
}

/** Errores que se muestran dentro del modal: por campo y uno general. */
export type ErroresFormulario = ErroresDeFormulario<CampoUsuario>;

/**
 * Traduce un error de la API al formulario (SDD S1.13 §2.6): `VALIDACION` con
 * `detalles[].ruta` va debajo de cada campo; `USUARIO_EXISTENTE` al CI;
 * `SEDE_INEXISTENTE` a la sede; el resto, como aviso general.
 */
export const erroresDelFormulario = (e: unknown): ErroresFormulario =>
  erroresDeFormulario(e, CAMPOS, { USUARIO_EXISTENTE: 'ci', SEDE_INEXISTENTE: 'sedeId' });

/** `usuario` de una cuenta nueva: CI o CI-COMPLEMENTO (D-25, igual que la API). */
export const usuarioDe = (ci: string, complemento: string): string => (complemento ? `${ci}-${complemento}` : ci);

/** Roles del personal que pueden sumar una cuenta de Administrador, `<CI>-ADM` (DEC-063, igual que la API). */
const ROLES_CON_CUENTA_ADMIN = new Set(['KARDEX', 'SEC_DIR', 'SEC_COORD', 'COORDINADOR']);

/** `usuario` de la cuenta nueva o null si esa persona no puede tener otra (DEC-063, igual que la API). */
export function usuarioNuevoDe(base: string, rol: string, rolesExistentes: readonly string[]): string | null {
  if (rolesExistentes.length === 0) return base;
  if (rol !== 'ADMIN' || rolesExistentes.length > 1 || !ROLES_CON_CUENTA_ADMIN.has(rolesExistentes[0])) return null;
  return `${base}-ADM`;
}

/** Nombre para mostrar: nombres y apellidos (igual que la API). */
export const nombreCompletoDe = (d: {
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
}): string => [d.nombres, d.apellidoPaterno, d.apellidoMaterno].filter(Boolean).join(' ');
