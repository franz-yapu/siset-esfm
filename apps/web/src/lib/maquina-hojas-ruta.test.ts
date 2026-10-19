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

  it('certificado recibido en Ancocagua: SEC_COORD lo deriva y lo entrega después de la firma (ADR-0011)', () => {
    expect(pasosDelFlujo('SIN_VALORADO_ANCOCAGUA').map((t) => [t.hacia, t.rol])).toEqual([
      ['AVISADO_KARDEX', 'SEC_COORD'],
      ['EN_IMPRESION', 'KARDEX'],
      ['IMPRESO', 'KARDEX'],
      ['FIRMADO_COORDINADOR', 'COORDINADOR'],
      ['ENTREGADO', 'SEC_COORD'],
    ]);
  });
});
