import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegistroBitacora } from '@/types';
import { ACCIONES_AUDITORIA, MODULOS_AUDITORIA } from '@/config/auditoria';
import { auditar, db, reset } from '@/mocks/db';
import { aRegistroAuditoria, accionDe, bitacoraMock, diaLaPaz, isoDesdeLocal, moduloDe } from './bitacora.mock';

beforeEach(() => {
  reset();
});

/** Reemplaza la bitácora del mock por registros de fecha fija. */
const fijar = (filas: Omit<RegistroBitacora, 'id'>[]) => {
  db.bitacora = filas.map((f, i) => ({ ...f, id: i + 1 }));
};

const fila = (p: Partial<RegistroBitacora>): Omit<RegistroBitacora, 'id'> => ({
  fecha: '2026-10-10T09:00',
  usuario: 'María Quispe Mamani',
  ip: '10.20.1.11',
  modulo: 'Seguridad',
  accion: 'Inicio de sesión',
  registro: 'kardex',
  antes: null,
  despues: null,
  ...p,
});

describe('bitacoraMock: traducción al contrato de la API (SDD S6.5 §2.4)', () => {
  it('todo registro de la semilla se traduce a una acción y un módulo de las listas cerradas', () => {
    expect(db.bitacora.length).toBeGreaterThan(0);
    for (const r of db.bitacora.map(aRegistroAuditoria)) {
      expect(ACCIONES_AUDITORIA).toContain(r.accion);
      expect(MODULOS_AUDITORIA).toContain(r.modulo);
      expect(r.fecha).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/);
    }
  });

  it('un módulo del prototipo sin traducción lanza un error', () => {
    expect(() => moduloDe('Reportes nuevos')).toThrow(/sin traducción/);
  });

  it('traduce las acciones de texto libre', () => {
    expect(accionDe('Inicio de sesión', 'SEGURIDAD')).toBe('LOGIN');
    expect(accionDe('Cuenta bloqueada por 5 intentos fallidos', 'SEGURIDAD')).toBe('BLOQUEO_CUENTA');
    expect(accionDe('Crear usuario', 'SEGURIDAD')).toBe('CREAR');
    expect(accionDe('Recibir pase', 'PASES')).toBe('CAMBIAR_ESTADO');
    expect(accionDe('Editar datos personales', 'FILES')).toBe('EDITAR');
    expect(accionDe('Reimprimir documento', 'DOCUMENTOS')).toBe('IMPRIMIR');
  });

  it('resuelve el autor y la entidad; "Sistema" queda sin usuario y "—" sin IP', () => {
    fijar([
      fila({ usuario: 'María Quispe Mamani', modulo: 'Usuarios', accion: 'Resetear contraseña', registro: 'seccoord' }),
      fila({ usuario: 'Sistema', ip: '—', modulo: 'Files', accion: 'Bloquear file', registro: 'EST-2024-0063' }),
    ]);
    const [a, b] = db.bitacora.map(aRegistroAuditoria);
    expect(a).toMatchObject({
      usuario: { id: 1, usuario: 'kardex', nombre: 'María Quispe Mamani' },
      accion: 'RESTABLECER_PASSWORD',
      modulo: 'SEGURIDAD',
      entidad: 'usuario',
      entidadId: '3',
      userAgent: null,
    });
    expect(b).toMatchObject({ usuario: null, ip: null, entidad: 'file', entidadId: 'EST-2024-0063' });
  });

  it('la hora local del prototipo se interpreta en La Paz (UTC−4)', () => {
    expect(isoDesdeLocal('2026-10-10T21:30')).toBe('2026-10-11T01:30:00.000Z');
    expect(diaLaPaz('2026-10-11T01:30:00.000Z')).toBe('2026-10-10');
  });
});

describe('bitacoraMock.listar: filtros, orden y paginación', () => {
  beforeEach(() => {
    fijar([
      fila({ fecha: '2026-10-09T23:59' }),
      fila({ fecha: '2026-10-10T00:00', usuario: 'Rosa Choque Apaza', registro: 'secdir' }),
      fila({ fecha: '2026-10-10T08:00', modulo: 'Files', accion: 'Editar datos personales', registro: 'EST-1' }),
      fila({ fecha: '2026-10-11T23:59', modulo: 'Files', accion: 'Registrar matrícula', registro: 'EST-1' }),
      fila({ fecha: '2026-10-12T00:00', accion: 'Cierre de sesión' }),
    ]);
  });

  it('ordena por fecha descendente y pagina con el total correcto', async () => {
    const p1 = await bitacoraMock.listar({}, 1, 2);
    expect(p1).toMatchObject({ pagina: 1, porPagina: 2, total: 5 });
    expect(p1.datos.map((r) => r.id)).toEqual([5, 4]);
    const p3 = await bitacoraMock.listar({}, 3, 2);
    expect(p3.datos.map((r) => r.id)).toEqual([1]);
    const p4 = await bitacoraMock.listar({}, 4, 2);
    expect(p4).toMatchObject({ datos: [], total: 5 });
  });

  it('a igual fecha, ordena por id descendente', async () => {
    fijar([fila({}), fila({})]);
    expect((await bitacoraMock.listar({}, 1, 10)).datos.map((r) => r.id)).toEqual([2, 1]);
  });

  it('desde/hasta son inclusivos en fecha de La Paz', async () => {
    const r = await bitacoraMock.listar({ desde: '2026-10-10', hasta: '2026-10-11' }, 1, 10);
    expect(r.datos.map((x) => x.id)).toEqual([4, 3, 2]);
  });

  it('filtra por usuario, módulo, acción y entidad, solos y combinados', async () => {
    const ids = async (f: Parameters<typeof bitacoraMock.listar>[0]) =>
      (await bitacoraMock.listar(f, 1, 10)).datos.map((x) => x.id);
    expect(await ids({ usuarioId: 2 })).toEqual([2]);
    expect(await ids({ modulo: 'FILES' })).toEqual([4, 3]);
    expect(await ids({ accion: 'LOGOUT' })).toEqual([5]);
    expect(await ids({ entidad: 'file', entidadId: 'EST-1' })).toEqual([4, 3]);
    expect(await ids({ modulo: 'FILES', accion: 'EDITAR' })).toEqual([3]);
    expect(await ids({ usuarioId: 1, modulo: 'SEGURIDAD' })).toEqual([5, 1]);
  });

  it('un evento nuevo de auditar() aparece primero, traducido', async () => {
    // Reloj fijo al final del día: los datos de ejemplo usan horas fijas de "hoy" (09:00, …). Con el reloj real,
    // después de las 20:00 en La Paz (medianoche UTC en la CI) quedaban después del evento nuevo.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 14, 23, 59));
    reset();
    auditar('María Quispe Mamani', 'Usuarios', 'Editar usuario', 'secdir', { rol: 'SEC_DIR' }, { rol: 'SEC_COORD' });
    const [primero] = (await bitacoraMock.listar({}, 1, 1)).datos;
    expect(primero).toMatchObject({
      usuario: { id: 1, usuario: 'kardex' },
      accion: 'EDITAR',
      modulo: 'SEGURIDAD',
      entidad: 'usuario',
      entidadId: '2',
      antes: { rol: 'SEC_DIR' },
      despues: { rol: 'SEC_COORD' },
    });
    vi.useRealTimers();
  });
});

describe('bitacoraMock.buscarUsuarios', () => {
  it('busca por usuario o nombre sin distinguir mayúsculas ni tildes', async () => {
    expect((await bitacoraMock.buscarUsuarios('MARIA')).map((u) => u.usuario)).toContain('kardex');
    expect(await bitacoraMock.buscarUsuarios('secdir')).toEqual([
      { id: 2, usuario: 'secdir', nombre: 'Rosa Choque Apaza' },
    ]);
  });
});
