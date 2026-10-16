import type { ColorSemaforo } from '@/types';
import type { EstadoRequisitoFile } from '@/types/requisitos';

/**
 * Semáforo del file (SDD S2.5 §2.1, DEC-031), la misma regla que la API
 * (apps/api/src/modulos/files/semaforo.ts); un test compara las dos con la misma tabla. La usa el mock.
 * `estados`: el de cada requisito obligatorio que aplica; `atrasado`: alguno de un año ya pasado (D-31, ADR-0007).
 */
export function semaforoDelFile(f: {
  bloqueado: boolean;
  estados: readonly EstadoRequisitoFile[];
  atrasado?: boolean;
}): ColorSemaforo {
  if (f.bloqueado || f.atrasado || f.estados.includes('OBSERVADO')) return 'ROJO';
  return f.estados.includes('PENDIENTE') ? 'AMARILLO' : 'VERDE';
}

/** El rojo sin bloqueo es por un requisito observado o atrasado: no se muestra "File bloqueado" (SDD S2.5 §2.1). */
export const textoSemaforo = (color: ColorSemaforo, bloqueado: boolean): string | undefined =>
  color === 'ROJO' && !bloqueado ? 'Requisito observado o atrasado' : undefined;
