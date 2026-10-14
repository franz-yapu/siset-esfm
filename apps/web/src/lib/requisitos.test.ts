import { describe, expect, it } from 'vitest';
import { hoyEnLaPaz, normalizarRequisito, validarRequisito } from './requisitos';

const base = { estado: 'COMPLETO' as const, fecha: '2026-08-14', nroDocumento: null, observacion: null };

describe('reglas de un requisito (SDD S2.4 §2.1)', () => {
  it.each([
    ['completo sin fecha', { fecha: null }, { fecha: 'Un requisito completo necesita la fecha' }],
    ['fecha futura', { fecha: '2026-10-15' }, { fecha: 'La fecha no puede ser futura' }],
    [
      'observado sin observación',
      { estado: 'OBSERVADO' as const, observacion: null },
      {
        observacion: 'Escriba la observación (por ejemplo, defensa reprobada o no presentada)',
      },
    ],
    ['pendiente sin nada', { estado: 'PENDIENTE' as const, fecha: null }, {}],
  ])('%s', (_caso, cambio, esperado) => {
    expect(validarRequisito({ ...base, ...cambio }, '2026-10-14')).toEqual(esperado);
  });

  it('normaliza los vacíos a null', () => {
    expect(normalizarRequisito({ estado: 'OBSERVADO', fecha: '', nroDocumento: ' ', observacion: ' x ' })).toEqual({
      estado: 'OBSERVADO',
      fecha: null,
      nroDocumento: null,
      observacion: 'x',
    });
  });

  it('hoy en La Paz: UTC−4', () => {
    expect(hoyEnLaPaz(Date.parse('2026-10-15T03:00:00Z'))).toBe('2026-10-14');
  });
});
