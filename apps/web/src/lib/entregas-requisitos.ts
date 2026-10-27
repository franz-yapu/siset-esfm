import type { CampoRequisito, EntregaRequisito } from '@/types/requisitos';
import { fecha } from './formato';

// Cómo se leen las entregas de requisitos y su comprobante (observación #3 del tutor, SDD OBS-T1).

const ETIQUETA: Record<CampoRequisito, string> = {
  estado: 'Estado',
  fecha: 'Fecha del documento',
  nroDocumento: 'N.º de documento',
  observacion: 'Observación',
  nombreCurso: 'Curso',
  entidadEmisora: 'Entidad emisora',
};

const ESTADO: Record<string, string> = { PENDIENTE: 'Pendiente', COMPLETO: 'Entregado', OBSERVADO: 'Observado' };

/** El N.º del comprobante: el del evento de la bitácora, con seis cifras. */
export const nroComprobante = (nro: number) => `REC-${String(nro).padStart(6, '0')}`;

const valor = (campo: CampoRequisito, v: string | null): string => {
  if (v === null || v === '') return '—';
  if (campo === 'estado') return ESTADO[v] ?? v;
  if (campo === 'fecha') return fecha(v);
  return v;
};

/** Cada cambio en una línea: "Estado: Entregado (antes: Pendiente)". */
export const lineasDeCambios = (e: Pick<EntregaRequisito, 'cambios'>) =>
  e.cambios.map((c) => ({
    etiqueta: ETIQUETA[c.campo],
    valor: valor(c.campo, c.despues),
    antes: c.antes === null ? null : valor(c.campo, c.antes),
  }));

/** En corto, para la lista: qué pasó con el documento. */
export function resumenEntrega(e: Pick<EntregaRequisito, 'cambios'>): string {
  const estado = e.cambios.find((c) => c.campo === 'estado')?.despues;
  if (estado === 'COMPLETO') return 'Recibido';
  if (estado === 'OBSERVADO') return 'Observado';
  if (estado === 'PENDIENTE') return 'Vuelto a pendiente';
  return 'Datos actualizados';
}

/** "Matrícula (gestión 2026)". */
export const documentoDe = (e: Pick<EntregaRequisito, 'nombre' | 'gestion'>) =>
  e.gestion ? `${e.nombre} (gestión ${e.gestion})` : e.nombre;

/** Días que el inicio del estudiante muestra su último cambio (observación #13 del tutor). */
export const DIAS_ULTIMO_CAMBIO = 14;

/**
 * "Tu Certificado TACFI 1 fue recibido y verificado el 26/10/2026": el último cambio de sus requisitos, para el
 * saludo del inicio. `bien` dice si es una buena noticia (con check) o un aviso (observado).
 */
export function mensajeUltimoCambio(e: EntregaRequisito): { texto: string; bien: boolean } {
  const doc = documentoDe(e);
  const cuando = fecha(e.fecha);
  switch (resumenEntrega(e)) {
    case 'Recibido':
      return { texto: `Tu ${doc} fue recibido y verificado correctamente el ${cuando}.`, bien: true };
    case 'Observado':
      return { texto: `Kardex observó tu ${doc} el ${cuando}. Revisa el detalle en tu file.`, bien: false };
    case 'Vuelto a pendiente':
      return { texto: `Tu ${doc} volvió a pendiente el ${cuando}. Acércate a Kardex.`, bien: false };
    default:
      return { texto: `Kardex actualizó tu ${doc} el ${cuando}.`, bien: true };
  }
}
