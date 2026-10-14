import { describe, expect, it } from 'vitest';
// Solo en el test: el bundle de la web nunca importa código de la API (como el de la política, S1.11).
import { CASOS_SEMAFORO } from '../../../api/test/fixtures/casos-semaforo';
import { semaforoDelFile, textoSemaforo } from './semaforo';

describe('paridad del semáforo con la API (SDD S2.5 §2.1)', () => {
  it.each(CASOS_SEMAFORO)('$caso → $color', ({ bloqueado, estados, color }) => {
    expect(semaforoDelFile({ bloqueado, estados })).toBe(color);
  });

  it('el rojo sin bloqueo dice "Requisito observado"', () => {
    expect(textoSemaforo('ROJO', false)).toBe('Requisito observado');
    expect(textoSemaforo('ROJO', true)).toBeUndefined();
    expect(textoSemaforo('VERDE', false)).toBeUndefined();
  });
});
