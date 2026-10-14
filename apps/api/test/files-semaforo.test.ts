import { describe, expect, it } from 'vitest';
import { semaforoDelFile } from '@/modulos/files/semaforo';
import { CASOS_SEMAFORO } from './fixtures/casos-semaforo';

describe('semáforo del file (SDD S2.5 §2.1, provisional hasta D-31)', () => {
  it.each(CASOS_SEMAFORO)('$caso → $color', ({ bloqueado, estados, color }) => {
    expect(semaforoDelFile({ bloqueado, estados })).toBe(color);
  });
});
