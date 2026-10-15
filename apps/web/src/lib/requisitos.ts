import type { DatosRequisito, EstadoRequisitoFile, RequisitoDelFile } from '@/types/requisitos';
import { erroresDeFormulario, type ErroresDeFormulario } from './formularios';

// Reglas del registro de un requisito (SDD S2.4 §2.1). Repiten las de
// apps/api/src/modulos/files/requisitos.esquemas.ts con los mismos mensajes.

export type CampoRequisito = keyof DatosRequisito;
const CAMPOS: readonly CampoRequisito[] = ['estado', 'fecha', 'nroDocumento', 'observacion'];

export const ETIQUETA_ESTADO: Record<EstadoRequisitoFile, string> = {
  PENDIENTE: 'Pendiente',
  COMPLETO: 'Completo',
  OBSERVADO: 'Observado',
};

/** Hoy en La Paz (UTC−4), AAAA-MM-DD. */
export const hoyEnLaPaz = (ahora = Date.now()): string => new Date(ahora - 4 * 60 * 60_000).toISOString().slice(0, 10);

const vacio = (v: string | null) => (v ?? '').trim() || null;

export const normalizarRequisito = (d: DatosRequisito): DatosRequisito => ({
  estado: d.estado,
  fecha: vacio(d.fecha),
  nroDocumento: vacio(d.nroDocumento),
  observacion: vacio(d.observacion),
});

export function validarRequisito(d: DatosRequisito, hoy = hoyEnLaPaz()): Partial<Record<CampoRequisito, string>> {
  const e: Partial<Record<CampoRequisito, string>> = {};
  if (d.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) e.fecha = 'Fecha con formato AAAA-MM-DD';
  else if (d.fecha && d.fecha > hoy) e.fecha = 'La fecha no puede ser futura';
  if (d.estado === 'COMPLETO' && !d.fecha) e.fecha = 'Un requisito completo necesita la fecha';
  if (d.estado === 'OBSERVADO' && !d.observacion) {
    e.observacion = 'Escriba la observación (por ejemplo, defensa reprobada o no presentada)';
  }
  if ((d.nroDocumento?.length ?? 0) > 40) e.nroDocumento = 'Hasta 40 caracteres';
  if ((d.observacion?.length ?? 0) > 255) e.observacion = 'Hasta 255 caracteres';
  return e;
}

export const erroresDelRequisito = (e: unknown): ErroresDeFormulario<CampoRequisito> => erroresDeFormulario(e, CAMPOS);

/** Lo que el estudiante tiene que resolver con Kardex: bloqueo, observados y pendientes obligatorios. */
export function alertasDelEstudiante(bloqueado: boolean, requisitos: RequisitoDelFile[]): string[] {
  const obligatorios = requisitos.filter((r) => r.obligatorio);
  const pendientes = obligatorios.filter((r) => r.estado === 'PENDIENTE').length;
  return [
    ...(bloqueado ? ['Tu file está bloqueado. Acércate a Kardex.'] : []),
    ...obligatorios
      .filter((r) => r.estado === 'OBSERVADO')
      .map((r) => `${r.nombre}: observado${r.observacion ? ` (${r.observacion})` : ''}.`),
    ...(pendientes
      ? [`Te faltan ${pendientes} requisito${pendientes === 1 ? '' : 's'} obligatorio${pendientes === 1 ? '' : 's'}.`]
      : []),
  ];
}
