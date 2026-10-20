import { describe, expect, it } from 'vitest';
import type { RequisitoDelFile } from '@/types/requisitos';
import { anioEnPalabras, filasDelFolder } from './folder-personal';

const req = (o: Partial<RequisitoDelFile>): RequisitoDelFile => ({
  codigo: 'X',
  nombre: 'Requisito',
  descripcion: null,
  anioFormacion: null,
  nivel: null,
  obligatorio: true,
  orden: 1,
  porGestion: false,
  soloAniosTerminados: false,
  gestionesEsperadas: null,
  pideCurso: false,
  soloGenero: null,
  soloModalidad: null,
  aplica: true,
  atrasado: false,
  estado: 'PENDIENTE',
  fecha: null,
  nroDocumento: null,
  observacion: null,
  nombreCurso: null,
  entidadEmisora: null,
  registradoPor: null,
  actualizado: null,
  gestiones: [],
  ...o,
});

const gestion = (g: string, estado: RequisitoDelFile['estado'] = 'COMPLETO') => ({
  gestion: g,
  estado,
  fecha: null,
  nroDocumento: null,
  observacion: null,
  registradoPor: null,
  actualizado: '2026-01-01T00:00:00Z',
});

describe('hoja del folder personal (DEC-062)', () => {
  it('marca SÍ lo completo, NO lo obligatorio que falta y nada lo que no corresponde, en el orden de la hoja', () => {
    const filas = filasDelFolder([
      req({ orden: 3, nombre: 'Libreta militar', aplica: false, soloGenero: 'MASCULINO' }),
      req({ orden: 1, nombre: 'Cédula', estado: 'COMPLETO' }),
      req({ orden: 2, nombre: 'REJAP', estado: 'OBSERVADO' }),
      req({ orden: 4, nombre: 'Pueblo indígena', aplica: false, soloModalidad: 'B1' }),
      req({ orden: 5, nombre: 'Licencia temporal', obligatorio: false }),
      req({ orden: 6, nombre: 'Reincorporación', obligatorio: false, estado: 'COMPLETO' }),
    ]);
    expect(filas).toEqual([
      { nro: 1, texto: 'Cédula', marca: 'SI', pedido: true },
      { nro: 2, texto: 'REJAP', marca: 'NO', pedido: true },
      { nro: 3, texto: 'Libreta militar (varones)', marca: null, pedido: false },
      { nro: 4, texto: 'Pueblo indígena (solo mod. B1)', marca: null, pedido: false },
      { nro: 5, texto: 'Licencia temporal (si corresponde)', marca: null, pedido: false },
      { nro: 6, texto: 'Reincorporación (si corresponde)', marca: 'SI', pedido: false },
    ]);
  });

  it('los por gestión listan sus gestiones completas en orden', () => {
    const [f] = filasDelFolder([
      req({
        nombre: 'Matrícula',
        porGestion: true,
        estado: 'COMPLETO',
        gestiones: [gestion('II/2024'), gestion('2023'), gestion('I/2024'), gestion('I/2025', 'PENDIENTE')],
      }),
    ]);
    expect(f!.texto).toBe('Matrícula 2023, I/2024, II/2024');
  });

  it('el año de formación en palabras', () => {
    expect(anioEnPalabras(4)).toBe('Cuarto');
    expect(anioEnPalabras(null)).toBe('');
  });
});
