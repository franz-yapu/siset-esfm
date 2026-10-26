// CSV para abrir en Excel (observación #5 del tutor, SDD OBS-T1): punto y coma, porque el Excel en español usa
// la coma como separador decimal, y BOM para que reconozca UTF-8 (tildes y ñ).

type Celda = string | number | null | undefined;

const SEPARADOR = ';';

const celda = (v: Celda): string => {
  const texto = v === null || v === undefined ? '' : String(v);
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

/** Filas a texto CSV (sin BOM), con fin de línea CRLF. */
export const aCsv = (filas: readonly (readonly Celda[])[]): string =>
  filas.map((f) => f.map(celda).join(SEPARADOR)).join('\r\n');

/** Descarga el CSV con BOM: el navegador lo guarda como archivo, sin pasar por el servidor. */
export function descargarCsv(nombre: string, filas: readonly (readonly Celda[])[]): void {
  const blob = new Blob(['﻿', aCsv(filas)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
