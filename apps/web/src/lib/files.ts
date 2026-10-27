import type { CambiosFile, DatosCrearFile } from '@/types/files';
import { erroresDeFormulario, type ErroresDeFormulario } from './formularios';

// Reglas del formulario del file (SDD S2.9-S2.10 §2.5). Repiten las de
// apps/api/src/modulos/files/files.esquemas.ts con los mismos mensajes: son una ayuda; manda la API.

export type CampoFile = keyof DatosCrearFile;
const CAMPOS: readonly CampoFile[] = [
  'ci',
  'complemento',
  'nombres',
  'apellidoPaterno',
  'apellidoMaterno',
  'fechaNacimiento',
  'celular',
  'email',
  'direccion',
  'codigo',
  'especialidadId',
  'anioIngreso',
  'condicion',
  'genero',
  'modalidad',
  'anioFormacion',
];

const ANIO_MIN = 1990;
const vacio = (v: string | null) => (v ?? '').trim() || null;

/** Recorta y deja en null lo vacío, igual que la API. */
export const normalizarDatosFile = (d: DatosCrearFile): DatosCrearFile => ({
  ...d,
  ci: d.ci.trim(),
  complemento: d.complemento.trim().toUpperCase(),
  nombres: d.nombres.trim(),
  apellidoPaterno: vacio(d.apellidoPaterno),
  apellidoMaterno: vacio(d.apellidoMaterno),
  fechaNacimiento: vacio(d.fechaNacimiento),
  celular: vacio(d.celular),
  email: vacio(d.email),
  direccion: vacio(d.direccion),
  codigo: d.codigo.trim(),
  modalidad: (vacio(d.modalidad)?.toUpperCase() ?? null) as DatosCrearFile['modalidad'],
});

/** `creando`: la modalidad solo se exige al registrar un estudiante, como en la API (D-45). */
export function validarDatosFile(
  d: DatosCrearFile,
  creando = true,
  anioActual = new Date().getFullYear(),
): Partial<Record<CampoFile, string>> {
  const e: Partial<Record<CampoFile, string>> = {};
  if (!/^\d{4,15}$/.test(d.ci)) e.ci = 'El CI debe tener de 4 a 15 dígitos';
  if (!/^[A-Z0-9]{0,5}$/.test(d.complemento)) e.complemento = 'El complemento tiene hasta 5 letras o dígitos';
  if (!d.nombres) e.nombres = 'Los nombres son obligatorios';
  if (!d.apellidoPaterno && !d.apellidoMaterno) e.apellidoPaterno = 'Debe tener al menos un apellido';
  if (d.fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(d.fechaNacimiento))
    e.fechaNacimiento = 'Fecha con formato AAAA-MM-DD';
  // DEC-064 #4: es la contraseña inicial del estudiante.
  if (creando && !d.fechaNacimiento && d.condicion === 'ESTUDIANTE')
    e.fechaNacimiento = 'La fecha de nacimiento es obligatoria para un estudiante: es su contraseña inicial';
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = 'El correo no tiene un formato válido';
  if (!d.codigo) e.codigo = 'El código de estudiante es obligatorio';
  if (!d.especialidadId) e.especialidadId = 'Elija la especialidad';
  if (!Number.isInteger(d.anioIngreso) || d.anioIngreso < ANIO_MIN)
    e.anioIngreso = `El año de ingreso va de ${ANIO_MIN} en adelante`;
  else if (d.anioIngreso > anioActual + 1) e.anioIngreso = 'El año de ingreso no puede ser posterior al año siguiente';
  // El código se valida contra el catálogo en la API (DEC-058); aquí solo el formato.
  if (d.modalidad && !/^[A-Z0-9]{1,10}$/.test(d.modalidad)) e.modalidad = 'Elija la modalidad de ingreso';
  // D-45: el estudiante se registra con su modalidad de ingreso.
  if (creando && !d.modalidad && d.condicion === 'ESTUDIANTE') e.modalidad = 'Elija la modalidad de ingreso';
  if (d.anioFormacion !== null && (!Number.isInteger(d.anioFormacion) || d.anioFormacion < 1 || d.anioFormacion > 5))
    e.anioFormacion = 'El año de formación va de 1 a 5';
  return e;
}

/** Solo los campos que cambiaron (PATCH, SDD §2.5). El CI y el complemento no se editan. */
export function cambiosDeFile(antes: DatosCrearFile, despues: DatosCrearFile): CambiosFile {
  const c: Record<string, unknown> = {};
  for (const k of CAMPOS) {
    if (k === 'ci' || k === 'complemento') continue;
    if (antes[k] !== despues[k]) c[k] = despues[k];
  }
  return c as CambiosFile;
}

/** `FILE_EXISTENTE` va al CI, `CODIGO_EXISTENTE` al código y `ESPECIALIDAD_INEXISTENTE` a la especialidad. */
export const erroresDelFormularioFile = (e: unknown): ErroresDeFormulario<CampoFile> =>
  erroresDeFormulario(e, CAMPOS, {
    FILE_EXISTENTE: 'ci',
    CODIGO_EXISTENTE: 'codigo',
    ESPECIALIDAD_INEXISTENTE: 'especialidadId',
  });
