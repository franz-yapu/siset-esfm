import { describe, expect, it } from 'vitest';
import { saludoDeLaHora } from './formato';

// La hora de Bolivia es UTC−4: las 09:00 UTC son las 05:00 en La Paz.
const aLas = (horaUtc: number) => new Date(Date.UTC(2026, 9, 26, horaUtc, 30));

describe('saludo según la hora de Bolivia (observación #13)', () => {
  it('días, tardes y noches', () => {
    expect(saludoDeLaHora(aLas(9))).toBe('Buenos días'); // 05:30
    expect(saludoDeLaHora(aLas(15))).toBe('Buenos días'); // 11:30
    expect(saludoDeLaHora(aLas(16))).toBe('Buenas tardes'); // 12:30
    expect(saludoDeLaHora(aLas(22))).toBe('Buenas tardes'); // 18:30
    expect(saludoDeLaHora(aLas(23))).toBe('Buenas noches'); // 19:30
    expect(saludoDeLaHora(aLas(3))).toBe('Buenas noches'); // 23:30 del día anterior
    expect(saludoDeLaHora(aLas(8))).toBe('Buenas noches'); // 04:30
  });
});
