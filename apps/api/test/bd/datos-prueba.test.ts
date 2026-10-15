import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { configDePrueba, SECRETO_JWT_DE_PRUEBA } from '../http/utilidades';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';
import { cargarDatosPrueba, repararCuentasPrueba } from '../../prisma/datos-prueba';

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba() });

beforeAll(() => sembrar(bd, KARDEX_DE_PRUEBA));
afterAll(() => bd.$disconnect());

describe('datos de prueba del despliegue (SDD S0.12 §2.3)', () => {
  it('carga personal, files y hojas de ruta; una segunda corrida no duplica nada', async () => {
    const r = await cargarDatosPrueba(bd, 'P-1ClaveDePrueba');
    expect(r).toEqual({ cargados: true, personal: 3, files: 30, hojas: 8 });
    expect(await cargarDatosPrueba(bd, 'P-1ClaveDePrueba')).toMatchObject({ cargados: false });
    expect(await bd.fileAcademico.count({ where: { codigoEstudiante: { startsWith: 'PRB-' } } })).toBe(30);
    expect(await bd.usuario.count({ where: { username: { in: ['9000002', '9000003', '9000004'] } } })).toBe(3);
  });

  it('el semáforo resultante tiene verde, amarillo y rojo, y hay dos files bloqueados', async () => {
    const kardex = await bd.usuario.findFirstOrThrow({ where: { rol: { codigo: 'KARDEX' } }, orderBy: { id: 'asc' } });
    const { token } = await firmarAccessToken(
      { usuarioId: kardex.id, rol: 'KARDEX', sedeId: kardex.sedeId, debeCambiarPassword: false },
      SECRETO_JWT_DE_PRUEBA,
      new Date(),
    );
    const total = async (q: Record<string, string>) =>
      (
        await request(app)
          .get('/api/v1/files')
          .query({ texto: 'PRB-', ...q })
          .set('Authorization', `Bearer ${token}`)
      ).body.total;
    expect(await total({ semaforo: 'VERDE' })).toBeGreaterThan(0);
    expect(await total({ semaforo: 'AMARILLO' })).toBeGreaterThan(0);
    expect(await total({ semaforo: 'ROJO' })).toBeGreaterThan(0);
    expect(await total({ bloqueado: 'true' })).toBe(2);
  });

  it('las hojas de ruta están en pasos distintos de los dos flujos, con un movimiento por paso', async () => {
    const hojas = await bd.hojaRuta.findMany({
      where: { file: { codigoEstudiante: { startsWith: 'PRB-' } } },
      include: { movimientos: true, tipoTramite: true },
    });
    expect(hojas).toHaveLength(8);
    const estados = new Set(hojas.map((h) => h.estadoActual));
    expect(estados.size).toBeGreaterThanOrEqual(6);
    expect(estados.has('ENTREGADO')).toBe(true);
    for (const h of hojas) {
      expect(h.movimientos.at(-1)?.estadoNuevo).toBe(h.estadoActual);
      expect(h.nroValorado !== null).toBe(h.tipoTramite.requiereValorado);
    }
  });

  it('repara las cuentas de prueba: contraseña común, sin cambio obligatorio, sin bloqueo y sin sesiones (§2.5)', async () => {
    const u = await bd.usuario.findUniqueOrThrow({ where: { username: '9000003' } });
    await bd.usuario.update({
      where: { id: u.id },
      data: {
        debeCambiarPassword: true,
        activo: false,
        intentosFallidos: 5,
        bloqueadoHasta: new Date(Date.now() + 3_600_000),
      },
    });
    const sesion = await bd.refreshToken.create({
      data: { usuarioId: u.id, tokenHash: 'a'.repeat(64), expiraEn: new Date(Date.now() + 3_600_000) },
    });

    expect(await repararCuentasPrueba(bd, 'Prueba.2026')).toBeGreaterThanOrEqual(3);

    const login = await request(app).post('/api/v1/auth/login').send({ usuario: '9000003', password: 'Prueba.2026' });
    expect(login.status).toBe(200);
    expect(login.body.usuario.rol).toBe('SEC_COORD');
    const reparado = await bd.usuario.findUniqueOrThrow({ where: { id: u.id } });
    expect(reparado).toMatchObject({ debeCambiarPassword: false, activo: true, bloqueadoHasta: null });
    expect((await bd.refreshToken.findUniqueOrThrow({ where: { id: sesion.id } })).revocadoEn).not.toBeNull();
  });

  it('rechaza una contraseña común que no cumple DEC-011', async () => {
    await expect(repararCuentasPrueba(bd, 'prueba')).rejects.toThrow(/DEC-011/);
  });
});
