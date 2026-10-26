import { describe, expect, it } from 'vitest';
import { leerEntrega, textoEntrega } from './entrega';

describe('leerEntrega (constancia de entrega)', () => {
  it('lee la entrega al titular', () => {
    const obs = textoEntrega({ entregadoA: 'Titular', ciReceptor: '8100001' });
    expect(leerEntrega(obs)).toEqual({ calidad: 'Titular', nombre: null, ci: '8100001', fecha: null });
  });

  it('lee la entrega a un familiar, con el parentesco como en el catálogo', () => {
    const obs = textoEntrega({
      entregadoA: 'Familiar',
      ciReceptor: '7788990',
      nombreReceptor: 'Ana Tarqui',
      parentesco: 'Hijo/a',
    });
    expect(leerEntrega(obs)).toEqual({ calidad: 'Hijo/a', nombre: 'Ana Tarqui', ci: '7788990', fecha: null });
  });

  it('lee la fecha cuando la entrega fue otro día', () => {
    const obs = `${textoEntrega({ entregadoA: 'Familiar', ciReceptor: '5566778', nombreReceptor: 'Rosa Flujo', parentesco: 'Madre' })} el 25/10/2026`;
    expect(leerEntrega(obs)).toEqual({ calidad: 'Madre', nombre: 'Rosa Flujo', ci: '5566778', fecha: '25/10/2026' });
  });

  it('devuelve null si no hay observación o no tiene el formato', () => {
    expect(leerEntrega(null)).toBeNull();
    expect(leerEntrega('Entregado en ventanilla')).toBeNull();
  });
});
