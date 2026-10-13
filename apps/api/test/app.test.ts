import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '@/app';

describe('crearApp', () => {
  it('responde 404 a una ruta que no existe', async () => {
    const respuesta = await request(crearApp()).get('/no-existe');
    expect(respuesta.status).toBe(404);
  });
});
