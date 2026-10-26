import { describe, expect, it } from 'vitest';
import { leerFecha, leerFilas, normalizar } from './importacion-files';

const ESPECIALIDADES = [
  { id: 1, nombre: 'Matemática' },
  { id: 2, nombre: 'Educación Primaria Comunitaria Vocacional' },
];
const ENCABEZADO = [
  'CI',
  'Complemento',
  'Código de estudiante',
  'Nombres',
  'Apellido paterno',
  'Apellido materno',
  'Fecha de nacimiento',
  'Celular',
  'Correo',
  'Especialidad',
  'Año de ingreso',
  'Condición',
  'Género',
  'Modalidad de ingreso',
  'Año de formación',
];

describe('importación de files desde Excel (DEC-064 #3)', () => {
  it('normaliza tildes, mayúsculas y espacios', () => {
    expect(normalizar('  Matemática ')).toBe('matematica');
    expect(normalizar('AÑO  de ingreso')).toBe('ano de ingreso');
  });

  it('lee fechas de celda o de texto, y rechaza las que no existen', () => {
    expect(leerFecha(new Date(Date.UTC(2004, 2, 15)))).toBe('2004-03-15');
    expect(leerFecha('15/03/2004')).toBe('2004-03-15');
    expect(leerFecha('5-3-2004')).toBe('2004-03-05');
    expect(leerFecha('2004-03-15')).toBe('2004-03-15');
    expect(leerFecha('')).toBeNull();
    expect(leerFecha('31/02/2004')).toBeUndefined();
    expect(leerFecha('marzo 2004')).toBeUndefined();
  });

  it('traduce una fila completa al contrato de la API', () => {
    const { filas, error } = leerFilas(
      [
        ENCABEZADO,
        [
          8100101,
          '',
          '209-RQM',
          'Rosa',
          'Quispe',
          'Mamani',
          '15/03/2004',
          71234567,
          '',
          'matematica',
          2024,
          'Estudiante',
          'F',
          'b1',
          '3',
        ],
      ],
      ESPECIALIDADES,
    );
    expect(error).toBeNull();
    expect(filas).toEqual([
      {
        filaExcel: 2,
        errores: [],
        datos: {
          ci: '8100101',
          complemento: '',
          codigo: '209-RQM',
          nombres: 'Rosa',
          apellidoPaterno: 'Quispe',
          apellidoMaterno: 'Mamani',
          fechaNacimiento: '2004-03-15',
          celular: '71234567',
          email: null,
          especialidadId: 1,
          anioIngreso: 2024,
          condicion: 'ESTUDIANTE',
          genero: 'FEMENINO',
          modalidad: 'B1',
          anioFormacion: 3,
        },
      },
    ]);
  });

  it('acepta las columnas en otro orden, salta filas vacías y numera como en el Excel', () => {
    const { filas } = leerFilas(
      [
        ['Nombres', 'CI', 'Código de estudiante', 'Especialidad', 'Año de ingreso', 'Condición'],
        [null, null, null, null, null, null],
        ['Juan', '7001', 'C-1', 'Matemática', 2019, 'Egresado'],
      ],
      ESPECIALIDADES,
    );
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ filaExcel: 3, datos: { nombres: 'Juan', ci: '7001', condicion: 'EGRESADO' } });
  });

  it('marca lo que no entiende, campo por campo', () => {
    const { filas } = leerFilas(
      [
        ENCABEZADO,
        [
          '1234',
          '',
          'X',
          'Ana',
          'Paz',
          '',
          '32/01/2000',
          '',
          '',
          'Historia',
          'dos mil',
          'Alumno',
          'otro',
          'A',
          'sexto',
        ],
      ],
      ESPECIALIDADES,
    );
    expect(filas[0].errores.map((e) => e.campo)).toEqual([
      'fechaNacimiento',
      'especialidadId',
      'anioIngreso',
      'condicion',
      'genero',
      'anioFormacion',
    ]);
    expect(filas[0].errores[1].mensaje).toBe('«Historia» no está en el catálogo de especialidades');
  });

  it('sin las columnas obligatorias, un error general', () => {
    expect(leerFilas([['Nombre', 'Carnet']], ESPECIALIDADES).error).toBe(
      'Faltan columnas en la fila 1: CI, Código de estudiante, Nombres, Especialidad, Año de ingreso. Use la plantilla.',
    );
  });
});
