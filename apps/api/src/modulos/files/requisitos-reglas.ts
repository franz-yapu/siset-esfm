import type { EstadoParaSemaforo } from './semaforo';

// Qué entra al semáforo (ADR-0007, DEC-051). Funciones puras: la web repite estas reglas en
// apps/web/src/lib/requisitos-reglas.ts y un test compara las dos con la misma tabla de casos.

export interface RequisitoParaReglas {
  obligatorio: boolean;
  anioFormacion: number | null;
  porGestion: boolean;
  soloGenero: 'FEMENINO' | 'MASCULINO' | null;
  soloModalidad: string | null;
}

export interface FileParaReglas {
  genero: 'FEMENINO' | 'MASCULINO' | null;
  modalidad: string | null;
  anioFormacion: number | null;
}

/**
 * Si el requisito se le pide a este file. Un requisito condicional no aplica si el file no tiene el dato. Una
 * modalidad de una letra ("B") vale para todas las que empiezan con ella (provisional, D-45).
 */
export function requisitoAplica(r: RequisitoParaReglas, f: FileParaReglas): boolean {
  if (r.soloGenero && f.genero !== r.soloGenero) return false;
  if (r.soloModalidad) {
    if (!f.modalidad) return false;
    return r.soloModalidad.length === 1 ? f.modalidad.startsWith(r.soloModalidad) : f.modalidad === r.soloModalidad;
  }
  return true;
}

/** Un requisito por gestión resume sus registros; sin ninguno está PENDIENTE. */
export function resumenDeGestiones(estados: readonly EstadoParaSemaforo[]): EstadoParaSemaforo {
  if (estados.length === 0) return 'PENDIENTE';
  if (estados.includes('OBSERVADO')) return 'OBSERVADO';
  return estados.includes('PENDIENTE') ? 'PENDIENTE' : 'COMPLETO';
}

/** D-31: el requisito es de un año que el estudiante ya pasó y no está completo. */
export const requisitoAtrasado = (r: RequisitoParaReglas, f: FileParaReglas, estado: EstadoParaSemaforo): boolean =>
  r.anioFormacion !== null && f.anioFormacion !== null && r.anioFormacion < f.anioFormacion && estado !== 'COMPLETO';

/** Lo que recibe el motor: el estado de cada obligatorio que aplica y si alguno está atrasado. */
export function entradaDelSemaforo<R extends RequisitoParaReglas>(
  catalogo: readonly R[],
  file: FileParaReglas,
  estadoDe: (r: R) => EstadoParaSemaforo,
): { estados: EstadoParaSemaforo[]; atrasado: boolean } {
  const aplican = catalogo.filter((r) => r.obligatorio && requisitoAplica(r, file));
  const estados = aplican.map(estadoDe);
  return { estados, atrasado: aplican.some((r, i) => requisitoAtrasado(r, file, estados[i]!)) };
}
