import { describe, expect, it } from 'vitest';
// Solo en el test: el bundle de la web nunca importa código de la API (como el de la política, S1.11).
import {
  CASOS_APLICA,
  CASOS_ATRASADO,
  CASOS_GESTIONES,
  CASOS_SEMAFORO,
} from '../../../api/test/fixtures/casos-semaforo';
import { semaforoDelFile, textoSemaforo } from './semaforo';
import { requisitoAplica, requisitoAtrasado, resumenDeGestiones } from './requisitos-reglas';

describe('paridad del semáforo con la API (SDD S2.5 §2.1, ADR-0007)', () => {
  it.each(CASOS_SEMAFORO)('$caso → $color', ({ bloqueado, estados, atrasado, color }) => {
    expect(semaforoDelFile({ bloqueado, estados, atrasado })).toBe(color);
  });

  it.each(CASOS_APLICA)('aplica: $caso → $aplica', ({ requisito, file, aplica }) => {
    expect(requisitoAplica(requisito, file)).toBe(aplica);
  });

  it.each(CASOS_GESTIONES)('gestiones: $caso → $resumen', ({ estados, resumen }) => {
    expect(resumenDeGestiones(estados)).toBe(resumen);
  });

  it.each(CASOS_ATRASADO)('atrasado: $caso → $atrasado', ({ anioRequisito, anioFile, estado, atrasado }) => {
    const requisito = {
      obligatorio: true,
      anioFormacion: anioRequisito,
      porGestion: false,
      soloGenero: null,
      soloModalidad: null,
    };
    expect(requisitoAtrasado(requisito, { genero: null, modalidad: null, anioFormacion: anioFile }, estado)).toBe(
      atrasado,
    );
  });

  it('el rojo sin bloqueo dice "Requisito observado o atrasado"', () => {
    expect(textoSemaforo('ROJO', false)).toBe('Requisito observado o atrasado');
    expect(textoSemaforo('ROJO', true)).toBeUndefined();
    expect(textoSemaforo('VERDE', false)).toBeUndefined();
  });
});
