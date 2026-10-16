import { describe, expect, it } from 'vitest';
import { semaforoDelFile } from '@/modulos/files/semaforo';
import {
  entradaDelSemaforo,
  requisitoAplica,
  requisitoAtrasado,
  resumenDeGestiones,
  type RequisitoParaReglas,
} from '@/modulos/files/requisitos-reglas';
import { CASOS_APLICA, CASOS_ATRASADO, CASOS_GESTIONES, CASOS_SEMAFORO } from './fixtures/casos-semaforo';

const req = (o: Partial<RequisitoParaReglas>): RequisitoParaReglas => ({
  obligatorio: true,
  anioFormacion: null,
  porGestion: false,
  soloGenero: null,
  soloModalidad: null,
  ...o,
});

describe('semáforo del file (SDD S2.5 §2.1, ADR-0007)', () => {
  it.each(CASOS_SEMAFORO)('$caso → $color', ({ bloqueado, estados, atrasado, color }) => {
    expect(semaforoDelFile({ bloqueado, estados, atrasado })).toBe(color);
  });
});

describe('qué entra al semáforo (ADR-0007)', () => {
  it.each(CASOS_APLICA)('aplica: $caso → $aplica', ({ requisito, file, aplica }) => {
    expect(requisitoAplica(requisito, file)).toBe(aplica);
  });

  it.each(CASOS_GESTIONES)('gestiones: $caso → $resumen', ({ estados, resumen }) => {
    expect(resumenDeGestiones(estados)).toBe(resumen);
  });

  it.each(CASOS_ATRASADO)('atrasado: $caso → $atrasado', ({ anioRequisito, anioFile, estado, atrasado }) => {
    const file = { genero: null, modalidad: null, anioFormacion: anioFile };
    expect(requisitoAtrasado(req({ anioFormacion: anioRequisito }), file, estado)).toBe(atrasado);
  });

  it('solo cuentan los obligatorios que aplican; un no obligatorio atrasado no pone rojo', () => {
    const catalogo = [
      req({ anioFormacion: 1 }),
      req({ soloGenero: 'MASCULINO' }),
      req({ obligatorio: false, anioFormacion: 1 }),
    ];
    const file = { genero: 'FEMENINO' as const, modalidad: 'A', anioFormacion: 2 };
    expect(entradaDelSemaforo(catalogo, file, () => 'PENDIENTE')).toEqual({ estados: ['PENDIENTE'], atrasado: true });
    expect(entradaDelSemaforo(catalogo, file, () => 'COMPLETO')).toEqual({ estados: ['COMPLETO'], atrasado: false });
  });
});
