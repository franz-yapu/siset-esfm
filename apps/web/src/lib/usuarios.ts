import type { DatosCrearUsuario } from '@/types/usuarios';
import { esRolPersonal } from '@/types/usuarios';
import { ErrorApi } from './errores';

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

const esCampo = (v: string): v is CampoUsuario => (CAMPOS as readonly string[]).includes(v);

/** Errores que se muestran dentro del modal: por campo y uno general. */
export interface ErroresFormulario {
  campos: ErroresUsuario;
  general: string | null;
}

/**
 * Traduce un error de la API al formulario (SDD S1.13 §2.6): `VALIDACION` con
 * `detalles[].ruta` va debajo de cada campo; `USUARIO_EXISTENTE` al CI;
 * `SEDE_INEXISTENTE` a la sede; el resto, como aviso general.
 */
export function erroresDelFormulario(e: unknown): ErroresFormulario {
  const mensaje = e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
  if (!(e instanceof ErrorApi)) return { campos: {}, general: mensaje };
  if (e.codigo === 'USUARIO_EXISTENTE') return { campos: { ci: e.message }, general: null };
  if (e.codigo === 'SEDE_INEXISTENTE') return { campos: { sedeId: e.message }, general: null };
  if (e.codigo !== 'VALIDACION') return { campos: {}, general: mensaje };

  const campos: ErroresUsuario = {};
  const sueltos: string[] = [];
  for (const d of Array.isArray(e.detalles) ? (e.detalles as unknown[]) : []) {
    if (typeof d !== 'object' || d === null) continue;
    const { ruta, mensaje: m } = d as { ruta?: unknown; mensaje?: unknown };
    if (typeof m !== 'string') continue;
    const campo = typeof ruta === 'string' ? (ruta.split('.').at(-1) ?? '') : '';
    if (esCampo(campo)) campos[campo] ??= m;
    else sueltos.push(m);
  }
  const general = sueltos.length ? sueltos.join(' ') : Object.keys(campos).length ? null : mensaje;
  return { campos, general };
}

/** `usuario` de una cuenta nueva: CI o CI-COMPLEMENTO (D-25, igual que la API). */
export const usuarioDe = (ci: string, complemento: string): string => (complemento ? `${ci}-${complemento}` : ci);

/** Nombre para mostrar: nombres y apellidos (igual que la API). */
export const nombreCompletoDe = (d: {
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
}): string => [d.nombres, d.apellidoPaterno, d.apellidoMaterno].filter(Boolean).join(' ');
