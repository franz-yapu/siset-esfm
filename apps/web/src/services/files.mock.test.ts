import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Usuario } from '@/types';
import type { DatosCrearFile } from '@/types/files';
import { db, reset } from '@/mocks/db';
import { ErrorApi } from '@/lib/errores';
import { filesMock } from './files.mock';
import { filesPrototipoService } from './files-prototipo.service';

vi.mock('@/lib/formato', async (original) => ({
  ...(await original<typeof import('@/lib/formato')>()),
  delay: () => Promise.resolve(),
}));

const kardex = (): Usuario => db.usuarios.find((u) => u.id === 1)!;

const nuevo = (extra: Partial<DatosCrearFile> = {}): DatosCrearFile => ({
  ci: '9911223',
  complemento: '1a',
  nombres: 'Juana',
  apellidoPaterno: 'Zuñiga',
  apellidoMaterno: 'Quispe',
  fechaNacimiento: '2004-05-10',
  celular: null,
  email: '',
  direccion: null,
  codigo: 'EST-2026-9001',
  especialidadId: 2,
  anioIngreso: 2026,
  condicion: 'ESTUDIANTE',
  genero: null,
  modalidad: 'A',
  anioFormacion: null,
  ...extra,
});

const codigoDe = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof ErrorApi ? e.codigo : 'OTRO';
  }
};

beforeEach(() => reset());

describe('filesMock: contrato de la API de S2.2 (SDD S2.9-S2.10 §2.1)', () => {
  it('lista paginada, ordenada por apellido, con los apellidos del seed partidos', async () => {
    const todos = await filesMock.listar({ pagina: 1, porPagina: 500 });
    expect(todos.total).toBe(db.files.length);
    const apellidos = todos.datos.map((f) => f.apellidoPaterno ?? '');
    expect(apellidos).toEqual([...apellidos].sort((a, b) => a.localeCompare(b, 'es')));
    const juan = todos.datos.find((f) => f.ci === '7012345')!;
    expect(juan).toMatchObject({ apellidoPaterno: 'Mamani', apellidoMaterno: 'Condori', especialidad: 'Matemática' });

    const p2 = await filesMock.listar({ pagina: 2, porPagina: 3 });
    expect(p2).toMatchObject({ pagina: 2, porPagina: 3, total: db.files.length });
    expect(p2.datos).toEqual(todos.datos.slice(3, 6));
  });

  it('filtra por texto (CI, código, nombre), especialidad, año, condición y bloqueo', async () => {
    const ids = async (f: Parameters<typeof filesMock.listar>[0]) =>
      (await filesMock.listar({ porPagina: 500, ...f })).datos.map((x) => x.id);
    expect(await ids({ texto: '7012345' })).toEqual([1]);
    expect(await ids({ texto: 'est-2023-0041' })).toEqual([1]);
    expect(await ids({ texto: 'juan carlos' })).toContain(1);
    for (const id of await ids({ especialidadId: 2 }))
      expect(db.files.find((f) => f.id === id)!.especialidad).toBe('Matemática');
    for (const id of await ids({ anioIngreso: 2023 }))
      expect(db.files.find((f) => f.id === id)!.anioIngreso).toBe(2023);
    for (const id of await ids({ condicion: 'EGRESADO' }))
      expect(db.files.find((f) => f.id === id)!.condicion).toBe('EGRESADO');
    const bloqueados = db.files.filter((f) => f.bloqueado).map((f) => f.id);
    expect((await ids({ bloqueado: true })).sort((x, y) => x - y)).toEqual(bloqueados.sort((x, y) => x - y));
  });

  it('crear normaliza, guarda en el almacén del prototipo y lo ven las otras pantallas', async () => {
    const f = await filesMock.crear(nuevo(), kardex());
    expect(f).toMatchObject({
      complemento: '1A',
      email: null,
      nombre: 'Juana Zuñiga Quispe',
      especialidad: 'Matemática',
      bloqueado: false,
    });
    const proto = await filesPrototipoService.obtener(f.id);
    expect(proto).toMatchObject({ apellidos: 'Zuñiga Quispe', especialidad: 'Matemática', codigo: 'EST-2026-9001' });
    expect(db.bitacora.at(-1)).toMatchObject({ accion: 'Crear file' });
  });

  it('mismos códigos de error que la API', async () => {
    await filesMock.crear(nuevo(), kardex());
    expect(await codigoDe(filesMock.crear(nuevo({ codigo: 'OTRO-1' }), kardex()))).toBe('FILE_EXISTENTE');
    expect(await codigoDe(filesMock.crear(nuevo({ ci: '9911224' }), kardex()))).toBe('CODIGO_EXISTENTE');
    expect(await codigoDe(filesMock.crear(nuevo({ ci: '9911225', codigo: 'X-2', especialidadId: 99 }), kardex()))).toBe(
      'ESPECIALIDAD_INEXISTENTE',
    );
    expect(await codigoDe(filesMock.crear(nuevo({ ci: '12AB', codigo: 'X-3' }), kardex()))).toBe('VALIDACION');
    expect(await codigoDe(filesMock.obtener(9999))).toBe('NO_ENCONTRADO');
  });

  it('editar cambia solo lo enviado, mantiene `apellidos` y registra antes y después', async () => {
    const antes = db.bitacora.length;
    const f = await filesMock.editar(1, { apellidoMaterno: 'Choque', especialidadId: 1 }, kardex());
    expect(f).toMatchObject({ apellidoPaterno: 'Mamani', apellidoMaterno: 'Choque', especialidadId: 1 });
    expect(db.files.find((x) => x.id === 1)!.apellidos).toBe('Mamani Choque');
    expect(db.bitacora).toHaveLength(antes + 1);
    expect(db.bitacora.at(-1)).toMatchObject({ antes: { apellidoMaterno: 'Condori', especialidadId: 2 } });
  });

  it('editar sin cambios reales no registra nada; con el CI o el código de otro, falla', async () => {
    const antes = db.bitacora.length;
    await filesMock.editar(1, { nombres: 'Juan Carlos' }, kardex());
    expect(db.bitacora).toHaveLength(antes);
    expect(await codigoDe(filesMock.editar(1, { ci: '1' } as never, kardex()))).toBe('VALIDACION');
    const otro = db.files.find((f) => f.id === 2)!.codigo;
    expect(await codigoDe(filesMock.editar(1, { codigo: otro }, kardex()))).toBe('CODIGO_EXISTENTE');
  });

  it('especialidades: el catálogo con ids', async () => {
    expect((await filesMock.especialidades())[1]).toEqual({ id: 2, nombre: 'Matemática' });
  });

  it('bloquear y desbloquear: mismo contrato y errores que la API (DEC-049)', async () => {
    const libre = db.files.find((f) => !f.bloqueado)!;
    const pdf = new File(['%PDF-1.7'], 'RA-045.pdf', { type: 'application/pdf' });
    const datos = {
      causa: 'LICENCIA_VOLUNTARIA',
      nroResolucion: ' RA-045/2026 ',
      fechaResolucion: '2026-10-10',
      glosa: ' Licencia temporal voluntaria ',
      pdf,
    } as const;
    expect(await codigoDe(filesMock.bloquear(libre.id, { ...datos, glosa: 'x' }, kardex()))).toBe('VALIDACION');
    expect(await codigoDe(filesMock.bloquear(libre.id, { ...datos, fechaResolucion: '2100-01-01' }, kardex()))).toBe(
      'VALIDACION',
    );
    expect(
      await codigoDe(filesMock.bloquear(libre.id, { ...datos, pdf: new File(['hola'], 'nota.txt') }, kardex())),
    ).toBe('VALIDACION');
    expect(await codigoDe(filesMock.desbloquear(libre.id, kardex()))).toBe('ESTADO_SIN_CAMBIO');
    expect(await filesMock.bloqueo(libre.id)).toBeNull();

    const b = await filesMock.bloquear(libre.id, datos, kardex());
    expect(b).toMatchObject({ bloqueado: true, motivoBloqueo: 'Licencia temporal voluntaria' });
    expect(db.bitacora.at(-1)).toMatchObject({ accion: 'Bloquear file', despues: { resolucion: 'RA-045/2026' } });
    expect(await filesMock.bloqueo(libre.id)).toMatchObject({
      causa: 'LICENCIA_VOLUNTARIA',
      nroResolucion: 'RA-045/2026',
      pdfNombre: 'RA-045.pdf',
    });
    expect(await filesMock.pdfBloqueo(libre.id)).toBe(pdf);
    expect(await codigoDe(filesMock.bloquear(libre.id, datos, kardex()))).toBe('ESTADO_SIN_CAMBIO');

    const d = await filesMock.desbloquear(libre.id, kardex());
    expect(d).toMatchObject({ bloqueado: false, motivoBloqueo: null });
    expect(db.bitacora.at(-1)).toMatchObject({ accion: 'Desbloquear file', antes: { resolucion: 'RA-045/2026' } });
    expect(await codigoDe(filesMock.pdfBloqueo(libre.id))).toBe('NO_ENCONTRADO');
  });
});
