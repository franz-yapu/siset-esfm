import { describe, expect, it } from 'vitest';
import type { DatosRequisito } from '@/types/requisitos';
import { alertasDelEstudiante, hoyEnLaPaz, normalizarRequisito, validarRequisito } from './requisitos';

const base: DatosRequisito = {
  estado: 'COMPLETO',
  fecha: '2026-08-14',
  nroDocumento: null,
  observacion: null,
  gestion: null,
  nombreCurso: null,
  entidadEmisora: null,
};
const SIMPLE = { porGestion: false, pideCurso: false };
const POR_GESTION = { porGestion: true, pideCurso: false };
const TACFI = { porGestion: false, pideCurso: true };

describe('reglas de un requisito (SDD S2.4 §2.1, DEC-051)', () => {
  it.each([
    ['completo sin fecha', SIMPLE, { fecha: null }, { fecha: 'Un requisito completo necesita la fecha' }],
    ['fecha futura', SIMPLE, { fecha: '2026-10-15' }, { fecha: 'La fecha no puede ser futura' }],
    [
      'observado sin observación',
      SIMPLE,
      { estado: 'OBSERVADO' as const, observacion: null },
      { observacion: 'Escriba la observación (por ejemplo, defensa reprobada o no presentada)' },
    ],
    ['pendiente sin nada', SIMPLE, { estado: 'PENDIENTE' as const, fecha: null }, {}],
    ['por gestión sin gestión', POR_GESTION, {}, { gestion: 'Indique la gestión (I/2025, II/2025 o 2023)' }],
    [
      'gestión mal escrita',
      POR_GESTION,
      { gestion: 'III/2025' },
      { gestion: 'Gestión con formato I/2025, II/2025 o 2023' },
    ],
    ['gestión anual', POR_GESTION, { gestion: '2023' }, {}],
    [
      'gestión en uno que no es por gestión',
      SIMPLE,
      { gestion: '2025' },
      { gestion: 'Este requisito no se registra por gestión' },
    ],
    [
      'TACFI completo sin curso ni entidad',
      TACFI,
      {},
      { nombreCurso: 'Escriba el nombre del curso', entidadEmisora: 'Escriba la entidad emisora' },
    ],
    ['TACFI completo con curso y entidad', TACFI, { nombreCurso: 'IA', entidadEmisora: 'ITS' }, {}],
    [
      'curso en uno que no es TACFI',
      SIMPLE,
      { nombreCurso: 'IA' },
      { nombreCurso: 'Este requisito no lleva curso ni entidad emisora' },
    ],
  ])('%s', (_caso, tipo, cambio, esperado) => {
    expect(validarRequisito({ ...base, ...cambio }, tipo, '2026-10-14')).toEqual(esperado);
  });

  it('normaliza los vacíos a null y la gestión en mayúsculas', () => {
    expect(
      normalizarRequisito({
        ...base,
        estado: 'OBSERVADO',
        fecha: '',
        nroDocumento: ' ',
        observacion: ' x ',
        gestion: ' ii/2025 ',
      }),
    ).toEqual({ ...base, estado: 'OBSERVADO', fecha: null, nroDocumento: null, observacion: 'x', gestion: 'II/2025' });
  });

  it('hoy en La Paz: UTC−4', () => {
    expect(hoyEnLaPaz(Date.parse('2026-10-15T03:00:00Z'))).toBe('2026-10-14');
  });

  it('alertas del estudiante: atrasados aparte; lo que no aplica no cuenta', () => {
    const r = (o: object) => ({
      nombre: 'X',
      obligatorio: true,
      aplica: true,
      atrasado: false,
      estado: 'PENDIENTE',
      observacion: null,
      ...o,
    });
    const lista = [
      r({ nombre: 'TACFI Artístico I', atrasado: true }),
      r({ nombre: 'Libreta militar', aplica: false }),
      r({ nombre: 'REJAP' }),
    ] as Parameters<typeof alertasDelEstudiante>[1];
    expect(alertasDelEstudiante(false, lista)).toEqual([
      'TACFI Artístico I: te falta de un año anterior.',
      'Te faltan 1 requisito obligatorio.',
    ]);
  });
});
