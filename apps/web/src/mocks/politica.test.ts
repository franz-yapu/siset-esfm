import { describe, expect, it } from 'vitest';
import { ACCIONES, RECURSOS } from '@/config/permisos';
// Solo en el test: el bundle de la web nunca importa código de la API (SDD S1.11 §2.3).
import * as api from '../../../api/src/modulos/seguridad/autorizacion.politica';
import { POLITICA_MOCK } from './politica';

describe('paridad de la política mock con la de la API (ADR-0002, DEC-015)', () => {
  it('POLITICA_MOCK es igual a la POLITICA de la API', () => {
    expect(POLITICA_MOCK).toEqual(api.POLITICA);
  });

  it('los recursos y acciones de la web son los de la API', () => {
    expect(RECURSOS).toEqual(api.RECURSOS);
    expect(ACCIONES).toEqual(api.ACCIONES);
  });
});
