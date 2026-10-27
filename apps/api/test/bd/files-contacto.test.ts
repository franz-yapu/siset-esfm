import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { hashPassword } from '@/modulos/seguridad';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { configDePrueba, SECRETO_JWT_DE_PRUEBA } from '../http/utilidades';
import { clienteDeTest, KARDEX_DE_PRUEBA, PASSWORD_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

// ADR-0013: el estudiante cambia su correo, celular, dirección y foto; el resto, solo Kardex.

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba() });
let siguiente = 6695100;
let kardexId = 0;
let especialidadId = 0;

/** Un PNG de 1×1 de verdad (los primeros bytes son los que revisa la API). */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'KARDEX' } });
  const sede = await bd.sede.findUniqueOrThrow({ where: { codigo: 'ANCOCAGUA' } });
  const ci = String(siguiente++);
  const persona = await bd.persona.create({ data: { ci, nombres: 'Kardex', apellidoPaterno: 'Contacto' } });
  kardexId = (
    await bd.usuario.create({
      data: {
        personaId: persona.id,
        rolId: rol.id,
        sedeId: sede.id,
        username: ci,
        passwordHash: await hashPassword(PASSWORD_DE_PRUEBA),
        debeCambiarPassword: false,
      },
    })
  ).id;
  especialidadId = (await bd.especialidad.findFirstOrThrow({ where: { activo: true } })).id;
});
afterAll(() => bd.$disconnect());

const token = async (usuarioId: number, rol: string) =>
  (
    await firmarAccessToken(
      { usuarioId, rol, sedeId: null, debeCambiarPassword: false },
      SECRETO_JWT_DE_PRUEBA,
      new Date(),
    )
  ).token;

/** Un file de estudiante (con su cuenta, DEC-064) y el token de esa cuenta. */
async function estudiante() {
  const ci = String(siguiente++);
  const r = await request(app)
    .post('/api/v1/files')
    .set('Authorization', `Bearer ${await token(kardexId, 'KARDEX')}`)
    .send({
      ci,
      nombres: 'Eva',
      apellidoPaterno: 'Contacto',
      fechaNacimiento: '2004-05-10',
      codigo: `CON-${ci}`,
      especialidadId,
      anioIngreso: 2024,
      modalidad: 'A',
    });
  expect(r.status).toBe(201);
  const u = await bd.usuario.findUniqueOrThrow({ where: { username: ci } });
  return { fileId: r.body.id as number, usuarioId: u.id, tk: await token(u.id, 'ESTUDIANTE') };
}

describe('el estudiante edita su contacto (ADR-0013)', () => {
  it('cambia celular y dirección de su file; queda en la bitácora con su usuario', async () => {
    const e = await estudiante();
    const r = await request(app)
      .patch('/api/v1/files/mio')
      .set('Authorization', `Bearer ${e.tk}`)
      .send({ celular: '71234567', direccion: 'Calle 3, Pucarani' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ id: e.fileId, celular: '71234567', direccion: 'Calle 3, Pucarani' });
    expect(
      await bd.logAuditoria.findFirstOrThrow({
        where: { entidad: 'file_academico', entidadId: String(e.fileId), accion: 'EDITAR' },
        orderBy: { id: 'desc' },
      }),
    ).toMatchObject({ usuarioId: e.usuarioId, datosDespues: { celular: '71234567', direccion: 'Calle 3, Pucarani' } });
  });

  it('no cambia su nombre ni su CI (400) ni edita su file por id (403)', async () => {
    const e = await estudiante();
    const nombre = await request(app)
      .patch('/api/v1/files/mio')
      .set('Authorization', `Bearer ${e.tk}`)
      .send({ nombres: 'Otra' });
    expect(nombre.status).toBe(400);
    const porId = await request(app)
      .patch(`/api/v1/files/${e.fileId}`)
      .set('Authorization', `Bearer ${e.tk}`)
      .send({ celular: '70000000' });
    expect(porId.status).toBe(403);
  });
});

describe('la foto del file (ADR-0013)', () => {
  it('el estudiante la sube, la ve y la quita; Kardex la ve; la bitácora guarda tipo y tamaño', async () => {
    const e = await estudiante();
    const subir = await request(app)
      .put('/api/v1/files/mio/foto')
      .set('Authorization', `Bearer ${e.tk}`)
      .attach('foto', PNG, { filename: 'yo.png', contentType: 'image/png' });
    expect(subir.status).toBe(200);
    expect(subir.body.foto).toEqual(expect.any(String));

    const mia = await request(app).get('/api/v1/files/mio/foto').set('Authorization', `Bearer ${e.tk}`);
    expect(mia.status).toBe(200);
    expect(mia.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(mia.body as Buffer, PNG)).toBe(0);
    const deKardex = await request(app)
      .get(`/api/v1/files/${e.fileId}/foto`)
      .set('Authorization', `Bearer ${await token(kardexId, 'KARDEX')}`);
    expect(deKardex.status).toBe(200);

    const evento = await bd.logAuditoria.findFirstOrThrow({
      where: { entidad: 'file_academico', entidadId: String(e.fileId) },
      orderBy: { id: 'desc' },
    });
    expect(evento.datosDespues).toEqual({ foto: { tipo: 'image/png', bytes: PNG.length } });

    const quitar = await request(app).delete('/api/v1/files/mio/foto').set('Authorization', `Bearer ${e.tk}`);
    expect(quitar.status).toBe(200);
    expect(quitar.body.foto).toBeNull();
    expect((await request(app).get('/api/v1/files/mio/foto').set('Authorization', `Bearer ${e.tk}`)).status).toBe(404);
    expect((await request(app).delete('/api/v1/files/mio/foto').set('Authorization', `Bearer ${e.tk}`)).status).toBe(
      422,
    );
  });

  it('rechaza lo que no es imagen aunque diga que lo es', async () => {
    const e = await estudiante();
    const r = await request(app)
      .put('/api/v1/files/mio/foto')
      .set('Authorization', `Bearer ${e.tk}`)
      .attach('foto', Buffer.from('<script>no soy imagen</script>'), { filename: 'x.png', contentType: 'image/png' });
    expect(r.status).toBe(400);
    expect(r.body.error.details[0]).toEqual({ ruta: 'body.foto', mensaje: 'La foto tiene que ser JPG, PNG o WebP' });
  });

  it('Kardex cambia la foto y la dirección de cualquier file', async () => {
    const e = await estudiante();
    const tk = await token(kardexId, 'KARDEX');
    const foto = await request(app)
      .put(`/api/v1/files/${e.fileId}/foto`)
      .set('Authorization', `Bearer ${tk}`)
      .attach('foto', PNG, { filename: 'f.png', contentType: 'image/png' });
    expect(foto.status).toBe(200);
    const dir = await request(app)
      .patch(`/api/v1/files/${e.fileId}`)
      .set('Authorization', `Bearer ${tk}`)
      .send({ direccion: 'Av. Principal 10' });
    expect(dir.body.direccion).toBe('Av. Principal 10');
  });
});
