import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Usuario } from '@/types';
import { db, reset } from '@/mocks/db';
import { ErrorApi } from '@/lib/errores';
import { requisitosMock } from './requisitos.mock';

vi.mock('@/lib/formato', async (original) => ({
  ...(await original<typeof import('@/lib/formato')>()),
  delay: () => Promise.resolve(),
}));

const kardex = (): Usuario => db.usuarios.find((u) => u.id === 1)!;
const codigoDe = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof ErrorApi ? e.codigo : 'OTRO';
  }
};

beforeEach(() => reset());

describe('requisitosMock: contrato de S2.4', () => {
  it('el catálogo provisional en orden; arranca con lo que el prototipo tenía', async () => {
    const lista = await requisitosMock.listar(1);
    expect(lista.map((r) => r.codigo)).toEqual([
      'TACFI_1',
      'TCLO_BASICO',
      'TACFI_2',
      'TCLO_INTERMEDIO',
      'TCLO_AVANZADO',
      'CERT_NOTAS',
    ]);
    const proto = db.files.find((f) => f.id === 1)!.requisitos;
    expect(lista[0].estado).toBe(proto.TACFI.estado === 'COMPLETO' ? 'COMPLETO' : 'PENDIENTE');
  });

  it('registrar: valida como la API, guarda quién y cuándo, y deja el evento', async () => {
    const id = db.files.find((f) => f.requisitos.TCLO.estado === 'PENDIENTE')!.id;
    expect(
      await codigoDe(
        requisitosMock.registrar(
          id,
          'TCLO_BASICO',
          { estado: 'COMPLETO', fecha: null, nroDocumento: null, observacion: null },
          kardex(),
        ),
      ),
    ).toBe('VALIDACION');
    expect(
      await codigoDe(
        requisitosMock.registrar(
          id,
          'NO_EXISTE',
          { estado: 'PENDIENTE', fecha: null, nroDocumento: null, observacion: null },
          kardex(),
        ),
      ),
    ).toBe('NO_ENCONTRADO');
    const r = await requisitosMock.registrar(
      id,
      'tclo_basico',
      { estado: 'OBSERVADO', fecha: null, nroDocumento: ' ', observacion: 'No se presentó' },
      kardex(),
    );
    expect(r).toMatchObject({
      estado: 'OBSERVADO',
      observacion: 'No se presentó',
      nroDocumento: null,
      registradoPor: { id: 1 },
    });
    expect(db.bitacora.at(-1)).toMatchObject({ despues: { requisito: 'TCLO_BASICO', estado: 'OBSERVADO' } });
    expect((await requisitosMock.listar(id)).find((x) => x.codigo === 'TCLO_BASICO')!.estado).toBe('OBSERVADO');
  });
});
