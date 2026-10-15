import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Rol, Usuario } from '@/types';
import { db, reset } from '@/mocks/db';
import { ErrorApi } from '@/lib/errores';
import { hojasRutaMock } from './hojasRuta.mock';

vi.mock('@/lib/formato', async (original) => ({
  ...(await original<typeof import('@/lib/formato')>()),
  delay: () => Promise.resolve(),
}));

const usuario = (rol: Rol, sedeId: number): Usuario => ({ ...db.usuarios[0], rol, sedeId, nombre: rol });
const secDir = () => usuario('SEC_DIR', 1);
const kardex = () => usuario('KARDEX', 2);
const egresado = () => db.files.find((f) => f.condicion === 'EGRESADO' && !f.bloqueado)!;
const codigo = (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e: ErrorApi) => e.codigo,
  );

beforeEach(reset);

describe('hojasRutaMock (SDD S3.8-S3.9 §2.1)', () => {
  it('ingesta: N.º correlativo, RECIBIDO y el aviso a Kardex lo deja en manos de Kardex', async () => {
    const h = await hojasRutaMock.crear(
      { fileId: egresado().id, tipoTramite: 'HISTORIAL_ACADEMICO', nroValorado: '004522', observacion: null },
      secDir(),
    );
    expect(h.nro).toMatch(/^HR-\d{4}-0000(09)$/);
    expect(h.estado).toBe('RECIBIDO');
    expect(h.acciones.map((a) => a.accion)).toEqual(['AVISAR_KARDEX']);
    await hojasRutaMock.transicion(h.nro, 'AVISAR_KARDEX', null, secDir());
    const visto = await hojasRutaMock.obtener(h.nro, kardex());
    expect(visto.estado).toBe('AVISADO_KARDEX');
    expect(visto.acciones.map((a) => a.accion)).toEqual(['RECOGER']);
    expect(visto.movimientos).toHaveLength(2);
  });

  it('valorado según el tipo, solo egresados, solo SEC_DIR en La Paz', async () => {
    const base = { fileId: egresado().id, observacion: null };
    expect(
      await codigo(hojasRutaMock.crear({ ...base, tipoTramite: 'HISTORIAL_ACADEMICO', nroValorado: null }, secDir())),
    ).toBe('VALIDACION');
    expect(
      await codigo(hojasRutaMock.crear({ ...base, tipoTramite: 'CERT_NOTAS_ANTERIOR', nroValorado: '1' }, secDir())),
    ).toBe('VALIDACION');
    const estudiante = db.files.find((f) => f.condicion === 'ESTUDIANTE')!;
    expect(
      await codigo(
        hojasRutaMock.crear(
          { ...base, fileId: estudiante.id, tipoTramite: 'CERT_NOTAS_ANTERIOR', nroValorado: null },
          secDir(),
        ),
      ),
    ).toBe('FILE_NO_EGRESADO');
    expect(
      await codigo(hojasRutaMock.crear({ ...base, tipoTramite: 'CERT_NOTAS_ANTERIOR', nroValorado: null }, kardex())),
    ).toBe('PROHIBIDO');
  });

  it('un paso de otro rol es 403 y uno fuera de estado es 409', async () => {
    const [h] = (await hojasRutaMock.listar({ estado: 'RECIBIDO' })).datos;
    expect(await codigo(hojasRutaMock.transicion(h.nro, 'AVISAR_KARDEX', null, kardex()))).toBe('PROHIBIDO');
    expect(await codigo(hojasRutaMock.transicion(h.nro, 'ENTREGAR', null, secDir()))).toBe('TRANSICION_INVALIDA');
  });

  it('lista con filtros y paginación', async () => {
    const todas = await hojasRutaMock.listar({});
    expect(todas.total).toBe(8);
    const pag = await hojasRutaMock.listar({ porPagina: 3, pagina: 2 });
    expect(pag.datos).toHaveLength(3);
    expect(
      (await hojasRutaMock.listar({ tipoTramite: 'HISTORIAL_ACADEMICO' })).datos.every(
        (h) => h.tipo.codigo === 'HISTORIAL_ACADEMICO',
      ),
    ).toBe(true);
  });
});
