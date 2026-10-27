import { describe, expect, it } from 'vitest';
import { cuadradoCentrado } from './foto';

describe('recorte de la foto (ADR-0013)', () => {
  it('toma el cuadrado centrado más grande', () => {
    expect(cuadradoCentrado(1200, 800)).toEqual([200, 0, 800]);
    expect(cuadradoCentrado(600, 900)).toEqual([0, 150, 600]);
    expect(cuadradoCentrado(500, 500)).toEqual([0, 0, 500]);
  });
});
