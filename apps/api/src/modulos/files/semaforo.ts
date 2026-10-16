// Semáforo del file (SDD S2.5 §2.1, DEC-031, ADR-0007). Qué requisitos entran y cuándo uno está atrasado lo decide
// `requisitos-reglas.ts`. La web tiene la misma regla en apps/web/src/lib/semaforo.ts y un test compara las dos con
// la misma tabla de casos.

export const COLORES_SEMAFORO = ['VERDE', 'AMARILLO', 'ROJO'] as const;
export type ColorSemaforo = (typeof COLORES_SEMAFORO)[number];

export type EstadoParaSemaforo = 'PENDIENTE' | 'COMPLETO' | 'OBSERVADO';

/**
 * `estados`: el de cada requisito **obligatorio, activo y que aplica** al file (sin registro = PENDIENTE).
 * `atrasado`: alguno es de un año que el estudiante ya pasó y no está completo (D-31).
 * Rojo: bloqueado, algún OBSERVADO o algo atrasado. Amarillo: algún PENDIENTE. Verde: todos COMPLETOS.
 */
export function semaforoDelFile(f: {
  bloqueado: boolean;
  estados: readonly EstadoParaSemaforo[];
  atrasado?: boolean;
}): ColorSemaforo {
  if (f.bloqueado || f.atrasado || f.estados.includes('OBSERVADO')) return 'ROJO';
  return f.estados.includes('PENDIENTE') ? 'AMARILLO' : 'VERDE';
}
