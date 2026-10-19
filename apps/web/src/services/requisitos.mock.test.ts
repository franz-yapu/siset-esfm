import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Usuario } from '@/types';
import type { DatosRequisito } from '@/types/requisitos';
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

const datos = (o: Partial<DatosRequisito> = {}): DatosRequisito => ({
  estado: 'COMPLETO',
  fecha: '2026-03-01',
  nroDocumento: null,
  observacion: null,
  gestion: null,
  nombreCurso: null,
  entidadEmisora: null,
  ...o,
});

describe('requisitosMock: contrato de S2.4 y DEC-051', () => {
  it('los 27 requisitos en orden; arranca con lo que el prototipo tenía', async () => {
    const lista = await requisitosMock.listar(1);
    expect(lista.map((r) => r.orden)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    const proto = db.files.find((f) => f.id === 1)!.requisitos;
    expect(lista.find((r) => r.codigo === 'TACFI_1')!.estado).toBe(
      proto.TACFI.estado === 'COMPLETO' ? 'COMPLETO' : 'PENDIENTE',
    );
  });

  it('registrar: valida como la API, guarda quién y cuándo, y deja el evento', async () => {
    const id = db.files.find((f) => f.requisitos.TCLO.estado === 'PENDIENTE')!.id;
    expect(await codigoDe(requisitosMock.registrar(id, 'CERT_TCLOA', datos({ fecha: null }), kardex()))).toBe(
      'VALIDACION',
    );
    expect(await codigoDe(requisitosMock.registrar(id, 'NO_EXISTE', datos(), kardex()))).toBe('NO_ENCONTRADO');
    const r = await requisitosMock.registrar(
      id,
      'cert_tcloa',
      datos({ estado: 'OBSERVADO', fecha: null, nroDocumento: ' ', observacion: 'No se presentó' }),
      kardex(),
    );
    expect(r).toMatchObject({
      estado: 'OBSERVADO',
      observacion: 'No se presentó',
      nroDocumento: null,
      registradoPor: { id: 1 },
    });
    expect(db.bitacora.at(-1)).toMatchObject({ despues: { requisito: 'CERT_TCLOA', estado: 'OBSERVADO' } });
  });

  it('por gestión y TACFI como la API', async () => {
    const id = db.files[0].id;
    expect(await codigoDe(requisitosMock.registrar(id, 'MATRICULA', datos(), kardex()))).toBe('VALIDACION');
    const m = await requisitosMock.registrar(id, 'MATRICULA', datos({ gestion: 'i/2026' }), kardex());
    expect(m.gestiones.map((g) => g.gestion)).toContain('I/2026');
    expect(await codigoDe(requisitosMock.registrar(id, 'TACFI_TEC_1', datos(), kardex()))).toBe('VALIDACION');
    const t = await requisitosMock.registrar(
      id,
      'TACFI_TEC_1',
      datos({ nombreCurso: 'IA aplicada', entidadEmisora: 'Instituto' }),
      kardex(),
    );
    expect(t).toMatchObject({ estado: 'COMPLETO', nombreCurso: 'IA aplicada', entidadEmisora: 'Instituto' });
  });

  it('DEC-060: el egresado no tiene requisitos y no se le registran', async () => {
    const egresado = db.files.find((f) => f.condicion === 'EGRESADO')!;
    expect(await requisitosMock.listar(egresado.id)).toEqual([]);
    expect(await codigoDe(requisitosMock.registrar(egresado.id, 'CERT_TCLOA', datos(), kardex()))).toBe(
      'FILE_EGRESADO',
    );
  });
});
