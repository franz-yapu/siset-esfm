import type { DatosRequisito, EstadoRequisitoFile, RequisitoDelFile } from '@/types/requisitos';
import { erroresDeFormulario, type ErroresDeFormulario } from './formularios';

// Reglas del registro de un requisito (SDD S2.4 §2.1, DEC-051). Repiten las de
// apps/api/src/modulos/files/requisitos.esquemas.ts y requisitos.servicio.ts con los mismos mensajes.

export type CampoRequisito = keyof DatosRequisito;
const CAMPOS: readonly CampoRequisito[] = [
  'estado',
  'fecha',
  'nroDocumento',
  'observacion',
  'gestion',
  'nombreCurso',
  'entidadEmisora',
];

export const ETIQUETA_ESTADO: Record<EstadoRequisitoFile, string> = {
  PENDIENTE: 'Pendiente',
  COMPLETO: 'Completo',
  OBSERVADO: 'Observado',
};

/** Hoy en La Paz (UTC−4), AAAA-MM-DD. */
export const hoyEnLaPaz = (ahora = Date.now()): string => new Date(ahora - 4 * 60 * 60_000).toISOString().slice(0, 10);

const vacio = (v: string | null) => (v ?? '').trim() || null;

/** Lo que distingue a un requisito al registrarlo (DEC-051). */
export type TipoRequisito = Pick<RequisitoDelFile, 'porGestion' | 'pideCurso'>;

export const normalizarRequisito = (d: DatosRequisito): DatosRequisito => ({
  estado: d.estado,
  fecha: vacio(d.fecha),
  nroDocumento: vacio(d.nroDocumento),
  observacion: vacio(d.observacion),
  gestion: vacio(d.gestion)?.toUpperCase() ?? null,
  nombreCurso: vacio(d.nombreCurso),
  entidadEmisora: vacio(d.entidadEmisora),
});

export function validarRequisito(
  d: DatosRequisito,
  tipo: TipoRequisito = { porGestion: false, pideCurso: false },
  hoy = hoyEnLaPaz(),
): Partial<Record<CampoRequisito, string>> {
  const e: Partial<Record<CampoRequisito, string>> = {};
  if (d.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) e.fecha = 'Fecha con formato AAAA-MM-DD';
  else if (d.fecha && d.fecha > hoy) e.fecha = 'La fecha no puede ser futura';
  if (d.estado === 'COMPLETO' && !d.fecha) e.fecha = 'Un requisito completo necesita la fecha';
  if (d.estado === 'OBSERVADO' && !d.observacion) {
    e.observacion = 'Escriba la observación (por ejemplo, defensa reprobada o no presentada)';
  }
  if ((d.nroDocumento?.length ?? 0) > 40) e.nroDocumento = 'Hasta 40 caracteres';
  if ((d.observacion?.length ?? 0) > 255) e.observacion = 'Hasta 255 caracteres';
  if (tipo.porGestion) {
    if (!d.gestion) e.gestion = 'Indique la gestión (I/2025, II/2025 o 2023)';
    else if (!/^((I|II)\/)?\d{4}$/.test(d.gestion)) e.gestion = 'Gestión con formato I/2025, II/2025 o 2023';
  } else if (d.gestion) e.gestion = 'Este requisito no se registra por gestión';
  if (tipo.pideCurso && d.estado === 'COMPLETO') {
    if (!d.nombreCurso) e.nombreCurso = 'Escriba el nombre del curso';
    if (!d.entidadEmisora) e.entidadEmisora = 'Escriba la entidad emisora';
  }
  if (!tipo.pideCurso && (d.nombreCurso || d.entidadEmisora)) {
    e.nombreCurso = 'Este requisito no lleva curso ni entidad emisora';
  }
  if ((d.nombreCurso?.length ?? 0) > 150) e.nombreCurso = 'Hasta 150 caracteres';
  if ((d.entidadEmisora?.length ?? 0) > 150) e.entidadEmisora = 'Hasta 150 caracteres';
  return e;
}

export const erroresDelRequisito = (e: unknown): ErroresDeFormulario<CampoRequisito> => erroresDeFormulario(e, CAMPOS);

/** Lo que el estudiante tiene que resolver con Kardex: bloqueo, atrasados, observados y pendientes obligatorios. */
export function alertasDelEstudiante(bloqueado: boolean, requisitos: RequisitoDelFile[]): string[] {
  const obligatorios = requisitos.filter((r) => r.obligatorio && r.aplica);
  const pendientes = obligatorios.filter((r) => r.estado === 'PENDIENTE' && !r.atrasado).length;
  return [
    ...(bloqueado ? ['Tu file está bloqueado. Acércate a Kardex.'] : []),
    ...obligatorios.filter((r) => r.atrasado).map((r) => `${r.nombre}: te falta de un año anterior.`),
    ...obligatorios
      .filter((r) => r.estado === 'OBSERVADO' && !r.atrasado)
      .map((r) => `${r.nombre}: observado${r.observacion ? ` (${r.observacion})` : ''}.`),
    ...(pendientes
      ? [`Te faltan ${pendientes} requisito${pendientes === 1 ? '' : 's'} obligatorio${pendientes === 1 ? '' : 's'}.`]
      : []),
  ];
}

/** Kardex ya anotó algo en este requisito (aunque hoy no se le pida al file). */
export const yaRegistrado = (r: Pick<RequisitoDelFile, 'registradoPor' | 'estado'>): boolean =>
  Boolean(r.registradoPor) || r.estado !== 'PENDIENTE';

/**
 * Los requisitos que se muestran de un file (DEC-066): solo los que se le piden por su modalidad y su género. Al
 * estudiante, además, los "si corresponde" solo cuando ya se registró alguno; Kardex los ve todos para poder
 * registrarlos. Un requisito ya registrado que dejó de corresponder (cambió la modalidad) sigue a la vista de Kardex.
 */
export const requisitosVisibles = <
  R extends Pick<RequisitoDelFile, 'aplica' | 'obligatorio' | 'registradoPor' | 'estado'>,
>(
  requisitos: readonly R[],
  paraEstudiante: boolean,
): R[] =>
  requisitos.filter((r) =>
    paraEstudiante ? r.aplica && (r.obligatorio || yaRegistrado(r)) : r.aplica || yaRegistrado(r),
  );
