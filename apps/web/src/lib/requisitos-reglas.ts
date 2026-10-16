import type { EstadoRequisitoFile as EstadoParaSemaforo } from '@/types/requisitos';

// Qué entra al semáforo (ADR-0007, DEC-051): las mismas reglas que la API
// (apps/api/src/modulos/files/requisitos-reglas.ts); un test compara las dos con la misma tabla. Las usa el mock.

export interface RequisitoParaReglas {
  obligatorio: boolean;
  anioFormacion: number | null;
  porGestion: boolean;
  /** En un por gestión: solo cuentan los años ya terminados (certificado de notas, D-47). */
  soloAniosTerminados: boolean;
  soloGenero: 'FEMENINO' | 'MASCULINO' | null;
  /** Modalidades separadas por coma ("B1,B2,B3"). */
  soloModalidad: string | null;
}

/** Una gestión registrada de un requisito por gestión. */
export interface GestionParaReglas {
  gestion: string;
  estado: EstadoParaSemaforo;
}

export interface FileParaReglas {
  genero: 'FEMENINO' | 'MASCULINO' | null;
  modalidad: string | null;
  anioFormacion: number | null;
}

/**
 * Si el requisito se le pide a este file. Un requisito condicional no aplica si el file no tiene el dato. Las
 * modalidades se comparan exactas: A, B1, B2 y B3 no son lo mismo (D-45).
 */
export function requisitoAplica(r: RequisitoParaReglas, f: FileParaReglas): boolean {
  if (r.soloGenero && f.genero !== r.soloGenero) return false;
  if (r.soloModalidad) return f.modalidad !== null && r.soloModalidad.split(',').includes(f.modalidad);
  return true;
}

/**
 * Cuántos años distintos tiene que cubrir un requisito por gestión (D-47, provisional hasta D-47b): uno por cada año
 * cursado, incluido el actual (matrícula), o por cada año ya terminado (certificado de notas). Sin año de formación,
 * basta con uno.
 */
export const gestionesEsperadas = (r: RequisitoParaReglas, f: FileParaReglas): number =>
  f.anioFormacion === null ? 1 : Math.max(0, f.anioFormacion - (r.soloAniosTerminados ? 1 : 0));

/** El año de una gestión: "II/2025" → 2025. */
const anioDe = (gestion: string) => gestion.slice(-4);

/**
 * Un requisito por gestión resume sus registros (ADR-0007): alguno OBSERVADO, OBSERVADO; alguno PENDIENTE o menos años
 * que los esperados, PENDIENTE; si no, COMPLETO.
 */
export function resumenDeGestiones(registros: readonly GestionParaReglas[], esperadas = 1): EstadoParaSemaforo {
  const estados = registros.map((g) => g.estado);
  if (estados.includes('OBSERVADO')) return 'OBSERVADO';
  if (estados.includes('PENDIENTE')) return 'PENDIENTE';
  return new Set(registros.map((g) => anioDe(g.gestion))).size < esperadas ? 'PENDIENTE' : 'COMPLETO';
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
