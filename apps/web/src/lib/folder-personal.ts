import type { RequisitoDelFile } from '@/types/requisitos';

// La hoja "Documentación existente en folder personal" (DEC-051, DEC-062): una fila por requisito del catálogo, en su
// orden, con la marca en SÍ o en NO según lo que Kardex registró.

export interface FilaFolder {
  nro: number;
  texto: string;
  /**
   * SÍ: lo tiene (completo). NO: es obligatorio para este file y le falta. Nada: no le corresponde (género o
   * modalidad) o es "si corresponde" y no lo presentó.
   */
  marca: 'SI' | 'NO' | null;
  /** Obligatorio para este file: cuenta en "tienes X de Y". */
  pedido: boolean;
}

/** Lo que la hoja de papel agrega al nombre: a quién se le pide. */
const aclaracion = (r: RequisitoDelFile): string =>
  r.soloGenero === 'MASCULINO'
    ? ' (varones)'
    : r.soloGenero === 'FEMENINO'
      ? ' (mujeres)'
      : r.soloModalidad
        ? ` (solo mod. ${r.soloModalidad.split(',').join(', ')})`
        : !r.obligatorio
          ? ' (si corresponde)'
          : '';

/** "Matrícula I/2022, I/2023, II/2024": en los por gestión, las gestiones completas, en orden. */
const conGestiones = (r: RequisitoDelFile): string => {
  const completas = r.gestiones
    .filter((g) => g.estado === 'COMPLETO')
    .map((g) => g.gestion)
    .sort((a, b) => a.slice(-4).localeCompare(b.slice(-4)) || a.localeCompare(b));
  return completas.length ? `${r.nombre} ${completas.join(', ')}` : r.nombre;
};

export function filasDelFolder(requisitos: readonly RequisitoDelFile[]): FilaFolder[] {
  return [...requisitos]
    .sort((a, b) => a.orden - b.orden)
    .map((r) => {
      const pedido = r.aplica && r.obligatorio;
      return {
        nro: r.orden,
        texto: (r.porGestion ? conGestiones(r) : r.nombre) + aclaracion(r),
        marca: r.aplica && r.estado === 'COMPLETO' ? 'SI' : pedido ? 'NO' : null,
        pedido,
      };
    });
}

const ANIOS = ['', 'Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'];

/** El año de formación en palabras, como en la hoja ("Cuarto"); vacío si no está cargado. */
export const anioEnPalabras = (anio: number | null): string => (anio ? (ANIOS[anio] ?? String(anio)) : '');
