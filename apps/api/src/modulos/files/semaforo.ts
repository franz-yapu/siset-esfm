// Semáforo del file (SDD S2.5 §2.1, DEC-031). Provisional hasta D-31: todavía no se sabe desde cuándo un
// requisito que falta está "atrasado". La web tiene la misma regla en apps/web/src/lib/semaforo.ts y un test
// compara las dos con la misma tabla de casos.

export const COLORES_SEMAFORO = ['VERDE', 'AMARILLO', 'ROJO'] as const;
export type ColorSemaforo = (typeof COLORES_SEMAFORO)[number];

export type EstadoParaSemaforo = 'PENDIENTE' | 'COMPLETO' | 'OBSERVADO';

/**
 * `estados`: el de cada requisito **obligatorio y activo** del catálogo (sin registro = PENDIENTE).
 * Rojo: bloqueado o algún OBSERVADO. Amarillo: algún PENDIENTE. Verde: todos COMPLETOS.
 */
export function semaforoDelFile(f: { bloqueado: boolean; estados: readonly EstadoParaSemaforo[] }): ColorSemaforo {
  if (f.bloqueado || f.estados.includes('OBSERVADO')) return 'ROJO';
  return f.estados.includes('PENDIENTE') ? 'AMARILLO' : 'VERDE';
}
