import { describe, expect, it } from 'vitest';
import { MODALIDADES_INICIALES as MODALIDADES } from '@/types/files';
import {
  alternarModalidad,
  aplicaAModalidad,
  codigoDesdeNombre,
  validarRequisitoCatalogo,
} from './catalogo-requisitos';

describe('catálogo de requisitos (DEC-055)', () => {
  it('el código sale del nombre, como en la API', () => {
    expect(codigoDesdeNombre('Título de bachiller ñandú', [])).toBe('TITULO_DE_BACHILLER_NANDU');
    expect(codigoDesdeNombre('Matrícula', ['MATRICULA', 'MATRICULA_2'])).toBe('MATRICULA_3');
    expect(codigoDesdeNombre('¡¡!!', [])).toBe('REQUISITO');
  });

  it('sin modalidades se pide a todas', () => {
    expect(aplicaAModalidad({ modalidades: [] }, 'B2')).toBe(true);
    expect(aplicaAModalidad({ modalidades: ['B1'] }, 'B2')).toBe(false);
  });

  it('alternar: desde "todas" quita una; nunca deja ninguna', () => {
    expect(alternarModalidad([], 'A', MODALIDADES)).toEqual(['B1', 'B2', 'B3']);
    expect(alternarModalidad(['B1'], 'B3', MODALIDADES)).toEqual(['B1', 'B3']);
    expect(alternarModalidad(['B1'], 'B1', MODALIDADES)).toBeNull();
    expect(alternarModalidad(['A', 'B1', 'B2'], 'B3', MODALIDADES)).toEqual(['A', 'B1', 'B2', 'B3']);
  });

  it('el nombre necesita 3 caracteres', () => {
    expect(validarRequisitoCatalogo({ nombre: ' ab ' }).nombre).toBeTruthy();
    expect(validarRequisitoCatalogo({ nombre: 'REJAP' })).toEqual({});
  });
});
