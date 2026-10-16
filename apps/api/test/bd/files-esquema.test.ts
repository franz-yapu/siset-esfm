import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clienteDeTest, crearUsuarioDePrueba, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
let especialidadId = 0;
let kardexId = 0;
let siguienteCi = 1110100;

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  especialidadId = (await bd.especialidad.findFirstOrThrow()).id;
  kardexId = (await crearUsuarioDePrueba(bd, '1110099')).id;
});
afterAll(() => bd.$disconnect());

/** Persona + file nuevos; `extra` pisa columnas del file. */
async function nuevoFile(extra: Record<string, unknown> = {}) {
  const ci = String(siguienteCi++);
  const persona = await bd.persona.create({ data: { ci, nombres: 'Estudiante', apellidoPaterno: 'Prueba' } });
  return bd.fileAcademico.create({
    data: { personaId: persona.id, codigoEstudiante: `EST-${ci}`, especialidadId, anioIngreso: 2024, ...extra },
  });
}
const requisito = (codigo: string) => bd.requisitoTipo.findUniqueOrThrow({ where: { codigo } });

describe('tablas del file académico (SDD S2.1 v1.1 §4)', () => {
  it('un file por persona y código de estudiante único', async () => {
    const f = await nuevoFile();
    await expect(
      bd.fileAcademico.create({
        data: { personaId: f.personaId, codigoEstudiante: 'OTRO-1', especialidadId, anioIngreso: 2024 },
      }),
    ).rejects.toThrow();
    const p = await bd.persona.create({ data: { ci: '1110098', nombres: 'Otra', apellidoPaterno: 'X' } });
    await expect(
      bd.fileAcademico.create({
        data: { personaId: p.id, codigoEstudiante: f.codigoEstudiante, especialidadId, anioIngreso: 2024 },
      }),
    ).rejects.toThrow();
  });

  it('valores por defecto: ESTUDIANTE, sin bloqueo y activo', async () => {
    expect(await nuevoFile()).toMatchObject({ condicion: 'ESTUDIANTE', bloqueado: false, activo: true });
  });

  it.each([1989, 2101])('rechaza el año de ingreso %i', async (anioIngreso) => {
    await expect(nuevoFile({ anioIngreso })).rejects.toThrow(/ck_file_anio/);
  });

  it('bloqueado exige un motivo no vacío', async () => {
    await expect(nuevoFile({ bloqueado: true })).rejects.toThrow(/ck_file_motivo/);
    await expect(nuevoFile({ bloqueado: true, motivoBloqueo: '   ' })).rejects.toThrow(/ck_file_motivo/);
    expect((await nuevoFile({ bloqueado: true, motivoBloqueo: '3 UF reprobadas en 2.º año' })).bloqueado).toBe(true);
  });

  it('un requisito COMPLETO exige fecha y responsable; PENDIENTE no', async () => {
    const f = await nuevoFile();
    const tacfi = await requisito('TACFI_1');
    await expect(
      bd.requisitoFile.create({ data: { fileId: f.id, requisitoTipoId: tacfi.id, estado: 'COMPLETO' } }),
    ).rejects.toThrow(/ck_requisito_completo/);
    await expect(
      bd.requisitoFile.create({
        data: { fileId: f.id, requisitoTipoId: tacfi.id, estado: 'COMPLETO', fecha: new Date('2026-05-10') },
      }),
    ).rejects.toThrow(/ck_requisito_completo/);
    expect(
      await bd.requisitoFile.create({
        data: {
          fileId: f.id,
          requisitoTipoId: tacfi.id,
          estado: 'COMPLETO',
          fecha: new Date('2026-05-10'),
          registradoPor: kardexId,
        },
      }),
    ).toMatchObject({ estado: 'COMPLETO' });
    const tclo = await requisito('CERT_TCLOA');
    expect(await bd.requisitoFile.create({ data: { fileId: f.id, requisitoTipoId: tclo.id } })).toMatchObject({
      estado: 'PENDIENTE',
      registradoPor: null,
    });
  });

  it('un file no puede tener dos veces el mismo requisito en la misma gestión (DEC-051)', async () => {
    const f = await nuevoFile();
    const notas = await requisito('CERT_NOTAS');
    await bd.requisitoFile.create({ data: { fileId: f.id, requisitoTipoId: notas.id, gestion: 'I/2025' } });
    await bd.requisitoFile.create({ data: { fileId: f.id, requisitoTipoId: notas.id, gestion: 'II/2025' } });
    await expect(
      bd.requisitoFile.create({ data: { fileId: f.id, requisitoTipoId: notas.id, gestion: 'I/2025' } }),
    ).rejects.toThrow();
    await expect(
      bd.requisitoFile.create({ data: { fileId: f.id, requisitoTipoId: notas.id, gestion: 'III/2025' } }),
    ).rejects.toThrow(/ck_requisito_gestion/);
  });

  it('el año de formación y la modalidad del file tienen formato (DEC-051)', async () => {
    const f = await nuevoFile();
    await expect(bd.fileAcademico.update({ where: { id: f.id }, data: { anioFormacion: 6 } })).rejects.toThrow(
      /ck_file_anio_formacion/,
    );
    await expect(bd.fileAcademico.update({ where: { id: f.id }, data: { modalidad: 'b1' } })).rejects.toThrow(
      /ck_file_modalidad/,
    );
  });

  it('el año de formación del catálogo va de 1 a 5', async () => {
    await expect(
      bd.requisitoTipo.create({ data: { codigo: 'PRUEBA_ANIO', nombre: 'Prueba', anioFormacion: 6 } }),
    ).rejects.toThrow(/ck_requisito_tipo_anio/);
  });

  it('RESTRICT: no se borra un requisito usado ni una persona con file', async () => {
    const f = await nuevoFile();
    const tacfi2 = await requisito('TACFI_2');
    await bd.requisitoFile.create({ data: { fileId: f.id, requisitoTipoId: tacfi2.id } });
    await expect(bd.requisitoTipo.delete({ where: { id: tacfi2.id } })).rejects.toThrow();
    await expect(bd.persona.delete({ where: { id: f.personaId } })).rejects.toThrow();
  });
});
