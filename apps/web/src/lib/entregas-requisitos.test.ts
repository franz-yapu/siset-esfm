import { describe, expect, it } from 'vitest';
import {
  documentoDe,
  lineasDeCambios,
  mensajeUltimoCambio,
  nroComprobante,
  resumenEntrega,
} from './entregas-requisitos';

describe('entregas de requisitos (SDD OBS-T1, #3)', () => {
  it('numera el comprobante con el id del evento', () => {
    expect(nroComprobante(42)).toBe('REC-000042');
  });

  it('resume qué pasó con el documento', () => {
    expect(resumenEntrega({ cambios: [{ campo: 'estado', antes: 'PENDIENTE', despues: 'COMPLETO' }] })).toBe(
      'Recibido',
    );
    expect(resumenEntrega({ cambios: [{ campo: 'estado', antes: 'COMPLETO', despues: 'OBSERVADO' }] })).toBe(
      'Observado',
    );
    expect(resumenEntrega({ cambios: [{ campo: 'fecha', antes: '2026-03-01', despues: '2026-03-02' }] })).toBe(
      'Datos actualizados',
    );
  });

  it('escribe cada cambio con su etiqueta, el estado en palabras y la fecha dd/mm/aaaa', () => {
    expect(
      lineasDeCambios({
        cambios: [
          { campo: 'estado', antes: 'PENDIENTE', despues: 'COMPLETO' },
          { campo: 'fecha', antes: null, despues: '2026-03-01' },
          { campo: 'observacion', antes: 'Falta copia', despues: null },
        ],
      }),
    ).toEqual([
      { etiqueta: 'Estado', valor: 'Entregado', antes: 'Pendiente' },
      { etiqueta: 'Fecha del documento', valor: '01/03/2026', antes: null },
      { etiqueta: 'Observación', valor: '—', antes: 'Falta copia' },
    ]);
  });

  it('nombra el documento con su gestión si la tiene', () => {
    expect(documentoDe({ nombre: 'Matrícula', gestion: '2026' })).toBe('Matrícula (gestión 2026)');
    expect(documentoDe({ nombre: 'Certificado de nacimiento', gestion: null })).toBe('Certificado de nacimiento');
  });

  it('arma el aviso del último cambio para el inicio del estudiante (observación #13)', () => {
    const base = {
      nro: 1,
      fecha: '2026-10-26T15:00:00.000Z',
      codigo: 'TACFI_1',
      nombre: 'Certificado TACFI 1',
      gestion: null,
      registradoPor: null,
    };
    expect(
      mensajeUltimoCambio({ ...base, cambios: [{ campo: 'estado', antes: 'PENDIENTE', despues: 'COMPLETO' }] }),
    ).toEqual({
      texto: 'Tu Certificado TACFI 1 fue recibido y verificado correctamente el 26/10/2026.',
      bien: true,
    });
    expect(
      mensajeUltimoCambio({ ...base, cambios: [{ campo: 'estado', antes: 'COMPLETO', despues: 'OBSERVADO' }] }).bien,
    ).toBe(false);
  });
});
