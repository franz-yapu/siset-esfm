import bcrypt from 'bcryptjs';
import { afterAll, describe, expect, it } from 'vitest';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
afterAll(() => bd.$disconnect());

const buscarKardex = () =>
  bd.usuario.findUniqueOrThrow({
    where: { username: KARDEX_DE_PRUEBA.ci },
    include: { rol: true, sede: true, persona: true },
  });

describe('seed del modelo v1 (SDD S0.11 §2.3)', () => {
  it('es idempotente: dos corridas dejan los mismos conteos', async () => {
    const primera = await sembrar(bd, KARDEX_DE_PRUEBA);
    const segunda = await sembrar(bd, KARDEX_DE_PRUEBA);
    expect(primera).toMatchObject({ roles: 6, sedes: 2, especialidades: 5, requisitosTipo: 27 });
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
    expect(kardex.persona).toMatchObject({ ci: KARDEX_DE_PRUEBA.ci, complemento: '', apellidoPaterno: 'Prueba' });
  });

  it('no pisa la contraseña de un Kardex que ya existe', async () => {
    const antes = await buscarKardex();
    await sembrar(bd, { ...KARDEX_DE_PRUEBA, password: 'otraClave999' });
    expect((await buscarKardex()).passwordHash).toBe(antes.passwordHash);
  });

  it('guarda la contraseña con bcrypt costo 12 (RNF-01)', async () => {
    const kardex = await buscarKardex();
    expect(kardex.passwordHash).toMatch(/^\$2[ab]\$12\$/);
    expect(await bcrypt.compare(KARDEX_DE_PRUEBA.password, kardex.passwordHash)).toBe(true);
  });

  it('con complemento, el username es CI-COMPLEMENTO', async () => {
    await sembrar(bd, { ...KARDEX_DE_PRUEBA, ci: '9000002', complemento: '1A' });
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
      soloModalidad: 'B1,B2,B3',
      obligatorio: false,
    });
  });

  it('el seed manda sobre el catálogo mientras Kardex no pueda editarlo (DEC-051)', async () => {
    await bd.requisitoTipo.update({ where: { codigo: 'TACFI_1' }, data: { nombre: 'Nombre editado' } });
    await sembrar(bd, KARDEX_DE_PRUEBA);
    expect((await bd.requisitoTipo.findUniqueOrThrow({ where: { codigo: 'TACFI_1' } })).nombre).toBe(
      'Certificado legalizado de TACFI – Artístico I',
    );
  });
});
