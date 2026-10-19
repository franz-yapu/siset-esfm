import { beforeEach, describe, expect, it } from 'vitest';
import type { Usuario } from '@/types';
import { db, reset } from '@/mocks/db';
import { ErrorApi } from '@/lib/errores';
import { catalogoModalidadesMock } from './catalogoModalidades.mock';
import { catalogoRequisitosMock } from './catalogoRequisitos.mock';

const kardex = (): Usuario => db.usuarios.find((u) => u.rol === 'KARDEX')!;
const codigo = (p: Promise<unknown>) =>
  p.then(
    () => 'OK',
    (e: unknown) => (e instanceof ErrorApi ? e.codigo : 'OTRO'),
  );

beforeEach(() => reset());

describe('catálogo de modalidades de la demo (DEC-058)', () => {
  it('arranca con A, B1, B2 y B3; agrega una con su código en mayúsculas y no la repite', async () => {
    expect((await catalogoModalidadesMock.activas()).map((m) => m.codigo)).toEqual(['A', 'B1', 'B2', 'B3']);
    const b4 = await catalogoModalidadesMock.crear(
      { codigo: 'b4', nombre: 'Modalidad B4', descripcion: null },
      kardex(),
    );
    expect(b4).toMatchObject({ codigo: 'B4', activo: true, requisitos: 0, orden: 5 });
    expect(
      await codigo(catalogoModalidadesMock.crear({ codigo: 'B4', nombre: 'Otra', descripcion: null }, kardex())),
    ).toBe('MODALIDAD_EXISTENTE');
  });

  it('un requisito se le pide a la nueva; dada de baja, no se acepta en un requisito', async () => {
    const b4 = await catalogoModalidadesMock.crear({ codigo: 'B4', nombre: 'B4', descripcion: null }, kardex());
    const r = await catalogoRequisitosMock.crear(
      {
        nombre: 'Solo B4',
        descripcion: null,
        anioFormacion: null,
        obligatorio: true,
        modalidades: ['B4'],
        soloGenero: null,
        porGestion: false,
        soloAniosTerminados: false,
        pideCurso: false,
      },
      kardex(),
    );
    expect(r.modalidades).toEqual(['B4']);
    expect((await catalogoModalidadesMock.listar()).find((m) => m.codigo === 'B4')?.requisitos).toBe(1);
    await catalogoModalidadesMock.darDeBaja(b4.id, kardex());
    expect((await catalogoModalidadesMock.activas()).map((m) => m.codigo)).not.toContain('B4');
    expect(await codigo(catalogoRequisitosMock.editar(r.id, { modalidades: ['B4', 'A'] }, kardex()))).toBe(
      'MODALIDAD_INEXISTENTE',
    );
  });
});
