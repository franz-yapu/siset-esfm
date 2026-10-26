import type { FiltrosReporte, ReporteHojasRuta } from '@/types/hojas-ruta';
import { ESTADOS_HR, sedeHr } from '@/config/estados-hoja-ruta';
import { fecha } from './formato';

// El reporte de trámites (P-60) como tablas: lo usan la hoja impresa y el CSV (observación #5 del tutor, SDD OBS-T1).

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-10" → "oct 26". */
export const etiquetaMes = (aaaaMm: string) => `${MESES[Number(aaaaMm.slice(5, 7)) - 1]} ${aaaaMm.slice(2, 4)}`;

export interface SeccionReporte {
  titulo: string;
  columnas: string[];
  filas: (string | number)[][];
}

/** Los filtros aplicados, en palabras: "Ingreso del 01/10/2026 al 26/10/2026 · Tipo: Historial académico". */
export function filtrosEnTexto(f: FiltrosReporte, tipos: readonly { codigo: string; nombre: string }[]): string {
  const rango =
    f.desde && f.hasta
      ? `Ingreso del ${fecha(f.desde)} al ${fecha(f.hasta)}`
      : f.desde
        ? `Ingreso desde el ${fecha(f.desde)}`
        : f.hasta
          ? `Ingreso hasta el ${fecha(f.hasta)}`
          : 'Todas las fechas de ingreso';
  const tipo = f.tipoTramite
    ? (tipos.find((t) => t.codigo === f.tipoTramite)?.nombre ?? f.tipoTramite)
    : 'Todos los tipos de trámite';
  return `${rango} · ${tipo}`;
}

export function seccionesReporte(k: ReporteHojasRuta): SeccionReporte[] {
  return [
    {
      titulo: 'Indicadores',
      columnas: ['Indicador', 'Valor'],
      filas: [
        ['Total de trámites', k.total],
        ['En curso', k.enCurso],
        ['Entregados', k.entregados],
        ['Devueltos con observación', k.devueltos],
        ['Tiempo promedio a la entrega (días)', k.tiempoPromedioDias ?? '—'],
        ['Atrasados > 72 horas', k.detenidos.length],
      ],
    },
    {
      titulo: 'Trámites por estado',
      columnas: ['Estado', 'Trámites'],
      filas: k.porEstado.map((e) => [ESTADOS_HR[e.estado].etiqueta, e.total]),
    },
    {
      titulo: 'Trámites por tipo',
      columnas: ['Tipo de trámite', 'Trámites'],
      filas: k.porTipo.map((t) => [t.nombre, t.total]),
    },
    {
      titulo: 'Ingresados por mes (últimos 6 meses)',
      columnas: ['Mes', 'Ingresados'],
      filas: k.porMes.map((m) => [etiquetaMes(m.mes), m.total]),
    },
    {
      titulo: 'Tiempo promedio en cada estado',
      columnas: ['Estado', 'Días'],
      filas: k.porEtapa.map((e) => [ESTADOS_HR[e.estado].etiqueta, e.dias]),
    },
    {
      titulo: 'Trámites atrasados: más de 72 horas sin moverse',
      columnas: ['N.º HR', 'Titular', 'Estado', 'Sede', 'Horas sin movimiento'],
      filas: k.detenidos.map((h) => [h.nro, h.titular, ESTADOS_HR[h.estado].etiqueta, sedeHr(h.sedeActual), h.horas]),
    },
  ];
}

/** El CSV: un encabezado (título, filtros, quién y cuándo) y cada sección separada por una fila vacía. */
export function filasCsvReporte(encabezado: string[], secciones: readonly SeccionReporte[]): (string | number)[][] {
  return [...encabezado.map((l) => [l]), ...secciones.flatMap((s) => [[], [s.titulo], s.columnas, ...s.filas])];
}
