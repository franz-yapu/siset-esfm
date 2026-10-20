import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Usuario } from '@/types';
import type { DatosCrearUsuario, FiltrosUsuarios } from '@/types/usuarios';
import { db, reset } from '@/mocks/db';
import { CLAVE_DEMO } from '@/mocks/usuarios';
import { ErrorApi } from '@/lib/errores';
import { aIso } from '@/lib/formato';
import { usuariosMock } from './usuarios.mock';

vi.mock('@/lib/formato', async (original) => ({
  ...(await original<typeof import('@/lib/formato')>()),
  delay: () => Promise.resolve(),
}));

const kardex = (): Usuario => db.usuarios.find((u) => u.id === 1)!;
const secdir = (): Usuario => db.usuarios.find((u) => u.id === 2)!;
const admin = (): Usuario => db.usuarios.find((u) => u.id === 19)!;
const pagina = (f: Partial<FiltrosUsuarios> = {}): FiltrosUsuarios => ({ pagina: 1, porPagina: 50, ...f });

const nuevo: DatosCrearUsuario = {
  ci: '4567890',
  complemento: '1b',
  nombres: 'Rosa',
  apellidoPaterno: 'Quispe',
  apellidoMaterno: null,
  email: '',
  celular: null,
  rol: 'SEC_COORD',
  sedeId: 2,
};

/** Ejecuta y devuelve el ErrorApi que lanza. */
const errorDe = async (p: Promise<unknown>): Promise<ErrorApi> => {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErrorApi) return e;
    throw e;
  }
  throw new Error('No lanzó ningún error');
};

const CLAVES_CONTRATO = [
  'activo',
  'apellidoMaterno',
  'apellidoPaterno',
  'bloqueadoHasta',
  'celular',
  'ci',
  'complemento',
  'debeCambiarPassword',
  'email',
  'estado',
  'id',
  'nombre',
  'nombres',
  'rol',
  'sedeId',
  'ultimoAcceso',
  'usuario',
];

beforeEach(() => {
  reset();
});

describe('usuariosMock.listar (contrato de S1.8)', () => {
  it('pagina y devuelve el total', async () => {
    const todos = await usuariosMock.listar(pagina());
    const p2 = await usuariosMock.listar(pagina({ pagina: 2, porPagina: 5 }));
    expect(todos.total).toBe(db.usuarios.length);
    expect(p2).toMatchObject({ pagina: 2, porPagina: 5, total: db.usuarios.length });
    expect(p2.datos.map((d) => d.id)).toEqual(todos.datos.slice(5, 10).map((d) => d.id));
  });

  it('filtra por texto en CI y en nombre, sin distinguir mayúsculas', async () => {
    expect((await usuariosMock.listar(pagina({ texto: 'QUISPE' }))).datos.map((d) => d.id)).toContain(1);
    expect((await usuariosMock.listar(pagina({ texto: '4812345' }))).datos.map((d) => d.id)).toEqual([1]);
  });

  it('filtra por rol, sede y estado (BLOQUEADO por bloqueadoHasta, INACTIVO por baja)', async () => {
    const ids = async (f: Partial<FiltrosUsuarios>) => (await usuariosMock.listar(pagina(f))).datos.map((d) => d.id);
    expect(await ids({ rol: 'KARDEX' })).toEqual(expect.arrayContaining([1, 5]));
    expect(await ids({ rol: 'KARDEX', estado: 'INACTIVO' })).toEqual([5]);
    expect(await ids({ estado: 'BLOQUEADO' })).toEqual([6]);
    expect(await ids({ sedeId: 1, rol: 'SEC_DIR' })).toEqual(expect.arrayContaining([2, 6]));
  });

  it('cada usuario tiene exactamente las claves del contrato de la API', async () => {
    const { datos } = await usuariosMock.listar(pagina());
    for (const d of datos) expect(Object.keys(d).sort()).toEqual(CLAVES_CONTRATO);
  });
});

describe('usuariosMock.crear', () => {
  it('crea con usuario CI-COMPLEMENTO, obliga a cambiar la clave y devuelve la temporal de la demo', async () => {
    const r = await usuariosMock.crear(nuevo, kardex());
    expect(r.passwordTemporal).toBe(CLAVE_DEMO);
    expect(r.usuario).toMatchObject({
      usuario: '4567890-1B',
      complemento: '1B',
      nombre: 'Rosa Quispe',
      email: null,
      estado: 'ACTIVO',
      debeCambiarPassword: true,
    });
    expect(db.usuarios.find((u) => u.usuario === '4567890-1B')?.debeCambiarClave).toBe(true);
    expect(db.bitacora.at(-1)).toMatchObject({ accion: 'Crear usuario', registro: '4567890-1B' });
  });

  it('CI + complemento repetido → 409 USUARIO_EXISTENTE (RF-03 CA3)', async () => {
    await usuariosMock.crear(nuevo, kardex());
    const e = await errorDe(usuariosMock.crear(nuevo, kardex()));
    expect([e.codigo, e.estado]).toEqual(['USUARIO_EXISTENTE', 409]);
  });

  it('al personal con cuenta se le suma solo la de Administrador, como CI-ADM; el rol de cada una no cambia (DEC-063)', async () => {
    const { usuario: base } = await usuariosMock.crear({ ...nuevo, ci: '4567891' }, kardex());
    const { usuario: admin } = await usuariosMock.crear({ ...nuevo, ci: '4567891', rol: 'ADMIN' }, kardex());
    expect([base.usuario, admin.usuario, admin.rol]).toEqual(['4567891-1B', '4567891-1B-ADM', 'ADMIN']);
    expect((await errorDe(usuariosMock.crear({ ...nuevo, ci: '4567891', rol: 'ADMIN' }, kardex()))).codigo).toBe(
      'USUARIO_EXISTENTE',
    );
    expect((await errorDe(usuariosMock.editar(base.id, { rol: 'KARDEX' }, kardex()))).codigo).toBe('CUENTA_DOBLE');
  });

  it('datos inválidos → 400 VALIDACION con detalles en el formato de la API', async () => {
    const e = await errorDe(usuariosMock.crear({ ...nuevo, ci: 'abc', apellidoPaterno: null }, kardex()));
    expect([e.codigo, e.estado]).toEqual(['VALIDACION', 400]);
    expect(e.detalles).toEqual([
      { ruta: 'body.ci', mensaje: 'El CI debe tener de 4 a 15 dígitos' },
      { ruta: 'body.apellidoPaterno', mensaje: 'Debe tener al menos un apellido' },
    ]);
  });

  it('sede que no existe → 422 SEDE_INEXISTENTE', async () => {
    const e = await errorDe(usuariosMock.crear({ ...nuevo, sedeId: 99 }, kardex()));
    expect([e.codigo, e.estado]).toEqual(['SEDE_INEXISTENTE', 422]);
  });
});

describe('usuariosMock.editar', () => {
  it('cambia solo lo enviado y la bitácora guarda solo eso', async () => {
    const d = await usuariosMock.editar(3, { celular: '70000000' }, kardex());
    expect(d).toMatchObject({ celular: '70000000', nombres: 'Ana', rol: 'SEC_COORD' });
    expect(db.bitacora.at(-1)).toMatchObject({
      accion: 'Editar usuario',
      antes: { celular: '71234503' },
      despues: { celular: '70000000' },
    });
  });

  it('el CI no se edita (DEC-020 #3) y un cuerpo vacío no vale', async () => {
    const conCi = { ci: '1111111' } as unknown as Parameters<typeof usuariosMock.editar>[1];
    expect((await errorDe(usuariosMock.editar(3, conCi, kardex()))).codigo).toBe('VALIDACION');
    expect((await errorDe(usuariosMock.editar(3, {}, kardex()))).codigo).toBe('VALIDACION');
  });

  it('nadie cambia su propio rol, ni deja al sistema sin Administrador (DEC-054)', async () => {
    expect((await errorDe(usuariosMock.editar(19, { rol: 'SEC_DIR' }, admin()))).codigo).toBe(
      'OPERACION_SOBRE_SI_MISMO',
    );
    expect((await errorDe(usuariosMock.editar(19, { rol: 'SEC_DIR' }, secdir()))).codigo).toBe('ULTIMO_ADMIN');
  });
});

describe('usuariosMock: baja, reactivar, restablecer, desbloquear', () => {
  it('baja lógica y reactivar, con su registro; repetir → ESTADO_SIN_CAMBIO (RF-03 CA2)', async () => {
    expect(await usuariosMock.darDeBaja(3, kardex())).toMatchObject({ activo: false, estado: 'INACTIVO' });
    expect(db.bitacora.at(-1)?.accion).toBe('Dar de baja usuario');
    expect((await errorDe(usuariosMock.darDeBaja(3, kardex()))).codigo).toBe('ESTADO_SIN_CAMBIO');
    expect(await usuariosMock.reactivar(3, kardex())).toMatchObject({ activo: true, estado: 'ACTIVO' });
    expect(db.bitacora.at(-1)?.accion).toBe('Reactivar usuario');
    expect((await errorDe(usuariosMock.reactivar(3, kardex()))).codigo).toBe('ESTADO_SIN_CAMBIO');
  });

  it('no se da de baja a sí mismo ni al último Administrador activo', async () => {
    expect((await errorDe(usuariosMock.darDeBaja(19, admin()))).codigo).toBe('OPERACION_SOBRE_SI_MISMO');
    expect((await errorDe(usuariosMock.darDeBaja(19, secdir()))).codigo).toBe('ULTIMO_ADMIN');
  });

  it('restablecer: obliga a cambiar, quita el bloqueo y devuelve la temporal (RF-03 CA4)', async () => {
    db.intentos.cvargas = 3;
    const r = await usuariosMock.restablecerPassword(6, kardex());
    expect(r.passwordTemporal).toBe(CLAVE_DEMO);
    expect(r.usuario).toMatchObject({ estado: 'ACTIVO', debeCambiarPassword: true, bloqueadoHasta: null });
    expect(db.intentos.cvargas).toBe(0);
    expect(db.bitacora.at(-1)?.accion).toBe('Restablecer contraseña');
  });

  it('desbloquear: quita el bloqueo; sin bloqueo → ESTADO_SIN_CAMBIO', async () => {
    expect(await usuariosMock.desbloquear(6, kardex())).toMatchObject({ estado: 'ACTIVO', bloqueadoHasta: null });
    expect(db.bitacora.at(-1)?.accion).toBe('Desbloquear cuenta');
    expect((await errorDe(usuariosMock.desbloquear(6, kardex()))).codigo).toBe('ESTADO_SIN_CAMBIO');
  });

  it('un bloqueo vencido no cuenta como bloqueado', async () => {
    db.usuarios.find((u) => u.id === 6)!.bloqueadoHasta = aIso(new Date(Date.now() - 60_000));
    expect((await usuariosMock.obtener(6)).estado).toBe('ACTIVO');
  });

  it('id inexistente → 404 NO_ENCONTRADO', async () => {
    const e = await errorDe(usuariosMock.obtener(999));
    expect([e.codigo, e.estado]).toEqual(['NO_ENCONTRADO', 404]);
  });
});
