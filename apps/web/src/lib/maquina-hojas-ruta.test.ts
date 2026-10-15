import { describe, expect, it } from 'vitest';
import { pasosDelFlujo } from './maquina-hojas-ruta';

describe('pasosDelFlujo', () => {
  it('con valorado: firmas de Dirección Académica y General en La Paz', () => {
    expect(pasosDelFlujo('CON_VALORADO').map((t) => t.hacia)).toEqual([
      'AVISADO_KARDEX',
      'EN_IMPRESION',
      'IMPRESO',
      'FIRMADO_DIR_ACADEMICA',
      'LISTO',
      'ENTREGADO',
    ]);
  });

  it('sin valorado: firma del Coordinador y remisión a Calahumana', () => {
    expect(pasosDelFlujo('SIN_VALORADO').map((t) => t.hacia)).toEqual([
      'AVISADO_KARDEX',
      'EN_IMPRESION',
      'IMPRESO',
      'FIRMADO_COORDINADOR',
      'REMITIDO_CALAHUMANA',
      'LISTO',
      'ENTREGADO',
    ]);
  });
});
