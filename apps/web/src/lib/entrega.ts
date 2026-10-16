import type { Entrega, Parentesco } from '@/types';

/** Hasta primer grado: consanguinidad (padres, hijos) y afinidad (suegros, yerno o nuera) (D-42). */
export const PARENTESCOS: readonly Parentesco[] = ['Padre', 'Madre', 'Hijo/a', 'Suegro/a', 'Yerno/Nuera'];

/**
 * La observación del paso ENTREGAR: a quién se entregó (DEC-046, D-42). Un familiar lleva su parentesco, nombre y CI,
 * y que se verificó el parentesco y firmó el recojo.
 */
export function textoEntrega(e: Omit<Entrega, 'fecha'>): string {
  const ci = e.ciReceptor.trim();
  if (e.entregadoA === 'Titular') return `Entregado a titular (CI ${ci})`;
  return `Entregado a familiar: ${e.parentesco?.toLowerCase()}, ${e.nombreReceptor?.trim()} (CI ${ci}); parentesco verificado y firma de recojo`;
}
