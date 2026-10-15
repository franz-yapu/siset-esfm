import { describe, expect, it } from 'vitest';
import { guiasDeTesis } from './visibilidad';

describe('guías de tesis (DEC-048)', () => {
  it('se ven en el entorno de prueba y en la demo', () => {
    expect(guiasDeTesis('true', 'false')).toBe(true);
    expect(guiasDeTesis('', 'true')).toBe(true);
  });
  it('no se ven en la instalación de la escuela', () => {
    expect(guiasDeTesis('', 'false')).toBe(false);
    expect(guiasDeTesis('false', '')).toBe(false);
  });
});
