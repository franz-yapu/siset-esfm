import bcrypt from 'bcryptjs';
import { afterAll, describe, expect, it } from 'vitest';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
afterAll(() => bd.$disconnect());

// Su propio Kardex: `datos-prueba` repara el 9000001 (cuenta de prueba) y el orden de los archivos no es fijo.
const KARDEX_SEMILLA = { ...KARDEX_DE_PRUEBA, ci: '9000160' };

const buscarKardex = () =>
  bd.usuario.findUniqueOrThrow({
    where: { username: KARDEX_SEMILLA.ci },
    include: { rol: true, sede: true, persona: true },
  });

describe('seed del modelo v1 (SDD S0.11 §2.3)', () => {
  it('es idempotente: dos corridas dejan los mismos conteos', async () => {
    const primera = await sembrar(bd, KARDEX_SEMILLA);
    const segunda = await sembrar(bd, KARDEX_SEMILLA);
    expect(primera).toMatchObject({ roles: 7, sedes: 2, especialidades: 5, requisitosTipo: 27 });
    // Los archivos comparten la base y otros tests crean usuarios con eventos en la
    // bitácora, que no se pueden borrar (ADR-0003): se cuenta "al menos uno".
    expect(primera.personas).toBeGreaterThanOrEqual(1);
    expect(primera.usuarios).toBeGreaterThanOrEqual(1);
    expect(segunda).toEqual(primera);
  });

  it('crea el Kardex con su persona, rol, sede y cambio de contraseña obligatorio', async () => {
    const kardex = await buscarKardex();
    expect(kardex.rol.codigo).toBe('KARDEX');
    expect(kardex.rol.descripcion).toBe('Responsable de Archivo Kardex');
    expect(kardex.sede?.codigo).toBe('ANCOCAGUA');
    expect(kardex.debeCambiarPassword).toBe(true);
    expect(kardex.persona).toMatchObject({ ci: KARDEX_SEMILLA.ci, complemento: '', apellidoPaterno: 'Prueba' });
  });

  it('no pisa la contraseña de un Kardex que ya existe', async () => {
    const antes = await buscarKardex();
    await sembrar(bd, { ...KARDEX_SEMILLA, password: 'otraClave999' });
    expect((await buscarKardex()).passwordHash).toBe(antes.passwordHash);
  });

  it('guarda la contraseña con bcrypt costo 12 (RNF-01)', async () => {
    const kardex = await buscarKardex();
    expect(kardex.passwordHash).toMatch(/^\$2[ab]\$12\$/);
    expect(await bcrypt.compare(KARDEX_SEMILLA.password, kardex.passwordHash)).toBe(true);
  });

  it('con complemento, el username es CI-COMPLEMENTO', async () => {
    await sembrar(bd, { ...KARDEX_SEMILLA, ci: '9000002', complemento: '1A' });
    expect(await bd.usuario.count({ where: { username: '9000002-1A' } })).toBe(1);
  });

  it('siembra los 24 del folder personal y las 3 defensas del TCLOA, en orden (DEC-051, DEC-052)', async () => {
    const activos = await bd.requisitoTipo.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
    expect(activos.map((r) => r.orden)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    expect(await bd.requisitoTipo.findUniqueOrThrow({ where: { codigo: 'TACFI_TEC_2' } })).toMatchObject({
      anioFormacion: 4,
      pideCurso: true,
      obligatorio: true,
    });
    expect(await bd.requisitoTipo.findUniqueOrThrow({ where: { codigo: 'MATRICULA' } })).toMatchObject({
      porGestion: true,
    });
    expect(await bd.requisitoTipo.findUniqueOrThrow({ where: { codigo: 'LIBRETA_MILITAR' } })).toMatchObject({
      soloGenero: 'MASCULINO',
    });
    expect(await bd.requisitoTipo.findUniqueOrThrow({ where: { codigo: 'LICENCIA_TEMPORAL' } })).toMatchObject({
      obligatorio: false,
    });
  });

  it('D-46: las defensas del TCLOA están activas, una por año, y el certificado de notas cuenta años terminados', async () => {
    const tclo = await bd.requisitoTipo.findUniqueOrThrow({ where: { codigo: 'TCLO_INTERMEDIO' } });
    expect(tclo).toMatchObject({ activo: true, anioFormacion: 2, nombre: 'Defensa del TCLOA – nivel intermedio' });
    expect(await bd.requisitoTipo.findUniqueOrThrow({ where: { codigo: 'CERT_NOTAS' } })).toMatchObject({
      soloAniosTerminados: true,
    });
    expect(await bd.requisitoTipo.findUniqueOrThrow({ where: { codigo: 'CALIF_SECUNDARIA' } })).toMatchObject({
      soloModalidad: 'B1',
      obligatorio: true,
    });
  });

  it('el seed no pisa lo que Kardex editó ni reactiva lo que dio de baja (DEC-055)', async () => {
    const original = 'Certificado legalizado de TACFI – Artístico I';
    await bd.requisitoTipo.update({ where: { codigo: 'TACFI_1' }, data: { nombre: 'Nombre editado' } });
    await bd.requisitoTipo.update({ where: { codigo: 'REJAP' }, data: { activo: false } });
    try {
      await sembrar(bd, KARDEX_SEMILLA);
      expect((await bd.requisitoTipo.findUniqueOrThrow({ where: { codigo: 'TACFI_1' } })).nombre).toBe(
        'Nombre editado',
      );
      expect((await bd.requisitoTipo.findUniqueOrThrow({ where: { codigo: 'REJAP' } })).activo).toBe(false);
    } finally {
      await bd.requisitoTipo.update({ where: { codigo: 'TACFI_1' }, data: { nombre: original } });
      await bd.requisitoTipo.update({ where: { codigo: 'REJAP' }, data: { activo: true } });
    }
  });

  it('crea el Administrador inicial si viene, con su rol y cambio de contraseña obligatorio (DEC-054)', async () => {
    await sembrar(bd, KARDEX_SEMILLA, { ...KARDEX_SEMILLA, ci: '9000150', nombres: 'Administrador' });
    const admin = await bd.usuario.findUniqueOrThrow({ where: { username: '9000150' }, include: { rol: true } });
    expect(admin.rol.codigo).toBe('ADMIN');
    expect(admin.debeCambiarPassword).toBe(true);
  });
});
