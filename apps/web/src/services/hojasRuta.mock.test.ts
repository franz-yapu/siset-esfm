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
const secCoord = () => usuario('SEC_COORD', 2);
const coordinador = () => usuario('COORDINADOR', 2);
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
    expect(h.nro).toMatch(/^HR-\d{4}-0000(10)$/);
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

  it('el historial impreso anota el valorado; con observación se devuelve y se cierra (DEC-053)', async () => {
    const nuevo = () =>
      hojasRutaMock.crear(
        { fileId: egresado().id, tipoTramite: 'HISTORIAL_ACADEMICO', nroValorado: '004522', observacion: null },
        secDir(),
      );
    const enImpresion = async () => {
      const h = await nuevo();
      await hojasRutaMock.transicion(h.nro, 'AVISAR_KARDEX', null, secDir());
      return hojasRutaMock.transicion(h.nro, 'RECOGER', null, kardex());
    };
    const a = await enImpresion();
    expect(a.acciones.map((x) => x.accion)).toEqual(['IMPRIMIR', 'DEVOLVER']);
    const impreso = await hojasRutaMock.transicion(a.nro, 'IMPRIMIR', null, kardex());
    expect(impreso.movimientos.at(-1)?.observacion).toBe('Impreso en el valorado N.º 004522.');

    const b = await enImpresion();
    expect(await codigo(hojasRutaMock.transicion(b.nro, 'DEVOLVER', '  ', kardex()))).toBe('VALIDACION');
    const devuelto = await hojasRutaMock.transicion(b.nro, 'DEVOLVER', 'Nota de 2.º año distinta', kardex());
    expect(devuelto.estado).toBe('DEVUELTO');
    expect(devuelto.fechaCierre).not.toBeNull();
    expect(devuelto.acciones).toEqual([]);
    const r = await hojasRutaMock.reporte({});
    expect(r.devueltos).toBe(1);
  });

  it('un paso de otro rol es 403 y uno fuera de estado es 409', async () => {
    const [h] = (await hojasRutaMock.listar({ estado: 'RECIBIDO' })).datos;
    expect(await codigo(hojasRutaMock.transicion(h.nro, 'AVISAR_KARDEX', null, kardex()))).toBe('PROHIBIDO');
    expect(await codigo(hojasRutaMock.transicion(h.nro, 'ENTREGAR', null, secDir()))).toBe('TRANSICION_INVALIDA');
  });

  it('lista con filtros y paginación', async () => {
    const todas = await hojasRutaMock.listar({});
    expect(todas.total).toBe(9);
    const pag = await hojasRutaMock.listar({ porPagina: 3, pagina: 2 });
    expect(pag.datos).toHaveLength(3);
    expect(
      (await hojasRutaMock.listar({ tipoTramite: 'HISTORIAL_ACADEMICO' })).datos.every(
        (h) => h.tipo.codigo === 'HISTORIAL_ACADEMICO',
      ),
    ).toBe(true);
  });

  it('certificado recibido en Ancocagua: SEC_COORD lo deriva y lo entrega; el historial no se recibe allí (ADR-0011)', async () => {
    const base = { fileId: egresado().id, nroValorado: null, observacion: null };
    expect(
      await codigo(hojasRutaMock.crear({ ...base, tipoTramite: 'HISTORIAL_ACADEMICO', nroValorado: '1' }, secCoord())),
    ).toBe('PROHIBIDO');
    const h = await hojasRutaMock.crear({ ...base, tipoTramite: 'CERT_NOTAS_ANTERIOR' }, secCoord());
    expect(h.sedeIngreso.codigo).toBe('ANCOCAGUA');
    expect(h.acciones.map((a) => a.etiqueta)).toEqual(['Derivar a Kardex']);
    await hojasRutaMock.transicion(h.nro, 'AVISAR_KARDEX', null, secCoord());
    await hojasRutaMock.transicion(h.nro, 'RECOGER', null, kardex());
    await hojasRutaMock.transicion(h.nro, 'IMPRIMIR', null, kardex());
    const firmado = await hojasRutaMock.transicion(h.nro, 'FIRMA_COORDINADOR', null, coordinador());
    expect(firmado.acciones).toEqual([]);
    expect(await codigo(hojasRutaMock.transicion(h.nro, 'REMITIR', null, kardex()))).toBe('TRANSICION_INVALIDA');
    const entregado = await hojasRutaMock.transicion(h.nro, 'ENTREGAR', 'Al titular.', secCoord());
    expect(entregado.estado).toBe('ENTREGADO');
    const ancocagua = await hojasRutaMock.listar({ sedeIngreso: 'ANCOCAGUA', porPagina: 100 });
    expect(ancocagua.datos.map((x) => x.nro)).toContain(h.nro);
  });
});
