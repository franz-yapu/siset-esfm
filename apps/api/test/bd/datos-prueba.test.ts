import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { configDePrueba, SECRETO_JWT_DE_PRUEBA } from '../http/utilidades';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';
import { cargarDatosPrueba } from '../../prisma/datos-prueba';

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
});
