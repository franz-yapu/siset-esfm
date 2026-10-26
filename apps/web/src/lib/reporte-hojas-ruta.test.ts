import { describe, expect, it } from 'vitest';
import type { ReporteHojasRuta } from '@/types/hojas-ruta';
import { aCsv } from './csv';
import { etiquetaMes, filasCsvReporte, filtrosEnTexto, seccionesReporte } from './reporte-hojas-ruta';

const reporte: ReporteHojasRuta = {
  total: 3,
  enCurso: 1,
  entregados: 1,
  devueltos: 1,
  tiempoPromedioDias: null,
  porEstado: [{ estado: 'RECIBIDO', total: 1 }],
  porTipo: [{ codigo: 'HIST', nombre: 'Historial académico', total: 3 }],
  porMes: [{ mes: '2026-10', total: 3 }],
  porEtapa: [{ estado: 'RECIBIDO', dias: 2.5 }],
  detenidos: [
    { nro: 'HR-2026-000001', titular: 'Rosa Choque', estado: 'RECIBIDO', sedeActual: 'LA_PAZ', horas: 80, dias: 3 },
  ],
};

describe('reporte de hojas de ruta', () => {
  it('etiqueta el mes en corto', () => {
    expect(etiquetaMes('2026-10')).toBe('oct 26');
  });

  it('describe los filtros en palabras', () => {
    const tipos = [{ codigo: 'HIST', nombre: 'Historial académico' }];
    expect(filtrosEnTexto({}, tipos)).toBe('Todas las fechas de ingreso · Todos los tipos de trámite');
    expect(filtrosEnTexto({ desde: '2026-10-01', hasta: '2026-10-26', tipoTramite: 'HIST' }, tipos)).toBe(
      'Ingreso del 01/10/2026 al 26/10/2026 · Historial académico',
    );
    expect(filtrosEnTexto({ hasta: '2026-10-26' }, tipos)).toMatch(/^Ingreso hasta el 26\/10\/2026/);
  });

  it('arma las seis secciones, con "—" sin tiempo promedio', () => {
    const s = seccionesReporte(reporte);
    expect(s.map((x) => x.titulo)).toHaveLength(6);
    expect(s[0].filas[4]).toEqual(['Tiempo promedio a la entrega (días)', '—']);
    expect(s[5].filas[0]).toEqual(['HR-2026-000001', 'Rosa Choque', 'Recibido', expect.any(String), 80]);
  });

  it('separa cada sección del CSV con una fila vacía', () => {
    const filas = filasCsvReporte(['Reporte'], seccionesReporte(reporte));
    expect(filas[0]).toEqual(['Reporte']);
    expect(filas[1]).toEqual([]);
    expect(filas[2]).toEqual(['Indicadores']);
  });
});

describe('aCsv', () => {
  it('usa punto y coma y CRLF, y entrecomilla lo que lo necesita', () => {
    expect(aCsv([['a', 1], ['Pérez; Juan', 'dijo "hola"'], [null]])).toBe('a;1\r\n"Pérez; Juan";"dijo ""hola"""\r\n');
  });
});
