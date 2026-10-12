import type { FileAcademico, Matricula, Requisito, ResultadoAnual } from '@/types';

const P: Requisito = { estado: 'PENDIENTE' };

/** Matrículas desde el año de ingreso; la última queda "Vigente" si aún está en formación. */
const matriculas = (anioIngreso: number, anios: number, enCurso: boolean): Matricula[] =>
  Array.from({ length: anios }, (_, i) => ({
    anio: i + 1,
    gestion: anioIngreso + i,
    estado: enCurso && i === anios - 1 ? 'Vigente' : 'Concluida',
  }));

/** Resultados anuales; `uf` indica las UF reprobadas de cada año concluido. */
const resultados = (uf: number[]): ResultadoAnual[] =>
  uf.map((n, i) => ({ anio: i + 1, resultado: n > 2 ? 'REPROBADO' : 'APROBADO', ufReprobadas: n }));

const completos = (sufijo: string, nivel: Requisito['nivel'] = 'Intermedio'): FileAcademico['requisitos'] => ({
  TACFI: { estado: 'COMPLETO', fecha: '2025-10-20', responsable: 'María Quispe Mamani' },
  TCLO: { estado: 'COMPLETO', nivel, nro: `TCLO-${sufijo}`, fecha: '2025-08-14' },
  CERT_NOTAS: { estado: 'COMPLETO', nro: `CN-${sufijo}`, fecha: '2026-02-10' },
});

export const seedFiles = (): FileAcademico[] => [
  // ── Estudiantes en formación ──────────────────────────────────────────
  {
    id: 1, ci: '7012345', nombres: 'Juan Carlos', apellidos: 'Mamani Condori',
    codigo: 'EST-2023-0041', especialidad: 'Matemática', anioIngreso: 2023,
    condicion: 'ESTUDIANTE', bloqueado: false, celular: '71234567', correo: 'jcmamani@gmail.com', fechaNacimiento: '2003-05-14',
    matriculas: matriculas(2023, 4, true),
    resultados: resultados([0, 1, 0]),
    requisitos: {
      TACFI: P,
      TCLO: { estado: 'COMPLETO', nivel: 'Intermedio', nro: 'TCLO-1182', fecha: '2025-11-04' },
      CERT_NOTAS: { estado: 'COMPLETO', nro: 'CN-5521', fecha: '2026-02-10' },
    },
  },
  {
    id: 2, ci: '7023456', nombres: 'Wilma', apellidos: 'Copa Quispe',
    codigo: 'EST-2022-0017', especialidad: 'Educación Primaria Comunitaria Vocacional', anioIngreso: 2022,
    condicion: 'ESTUDIANTE', bloqueado: false, celular: '72345678', fechaNacimiento: '2002-09-02',
    matriculas: matriculas(2022, 5, true), resultados: resultados([0, 0, 1, 0]), requisitos: completos('1090', 'Avanzado'),
  },
  {
    id: 3, ci: '7034567', nombres: 'Edwin', apellidos: 'Limachi Huanca',
    codigo: 'EST-2024-0063', especialidad: 'Ciencias Naturales: Biología-Geografía', anioIngreso: 2024,
    condicion: 'ESTUDIANTE', bloqueado: true, motivoBloqueo: '3 UF reprobadas en 2.º año (límite: 2)',
    celular: '73456789', fechaNacimiento: '2004-01-21',
    matriculas: matriculas(2024, 3, true), resultados: resultados([1, 3]),
    requisitos: { TACFI: P, TCLO: { estado: 'COMPLETO', nivel: 'Básico', nro: 'TCLO-1305', fecha: '2025-06-11' }, CERT_NOTAS: { estado: 'COMPLETO', nro: 'CN-5602', fecha: '2026-02-12' } },
  },
  {
    id: 4, ci: '7045678', nombres: 'Norma', apellidos: 'Callisaya Ticona',
    codigo: 'EST-2025-0008', especialidad: 'Comunicación y Lenguajes', anioIngreso: 2025,
    condicion: 'ESTUDIANTE', bloqueado: false, celular: '74567890', fechaNacimiento: '2005-07-30',
    matriculas: matriculas(2025, 2, true), resultados: resultados([2]),
    requisitos: { TACFI: P, TCLO: P, CERT_NOTAS: { estado: 'COMPLETO', nro: 'CN-5710', fecha: '2026-02-15' } },
  },
  {
    id: 5, ci: '7056789', nombres: 'Freddy', apellidos: 'Apaza Nina',
    codigo: 'EST-2022-0029', especialidad: 'Educación Física y Deportes', anioIngreso: 2022,
    condicion: 'ESTUDIANTE', bloqueado: false, celular: '75678901', fechaNacimiento: '2001-12-03',
    matriculas: matriculas(2022, 5, true), resultados: resultados([0, 0, 0, 1]), requisitos: completos('1121'),
  },
  {
    id: 6, ci: '7067890', nombres: 'Sonia', apellidos: 'Laura Mayta',
    codigo: 'EST-2023-0052', especialidad: 'Matemática', anioIngreso: 2023,
    condicion: 'ESTUDIANTE', bloqueado: false, celular: '76789012', fechaNacimiento: '2003-03-18',
    matriculas: matriculas(2023, 4, true), resultados: resultados([0, 2, 1]),
    requisitos: { TACFI: { estado: 'COMPLETO', fecha: '2025-10-22', responsable: 'María Quispe Mamani' }, TCLO: { estado: 'COMPLETO', nivel: 'Intermedio', nro: 'TCLO-1240', fecha: '2025-09-01' }, CERT_NOTAS: P },
  },
  {
    id: 7, ci: '7078901', nombres: 'Rubén', apellidos: 'Chambi Alanoca',
    codigo: 'EST-2026-0011', especialidad: 'Educación Primaria Comunitaria Vocacional', anioIngreso: 2026,
    condicion: 'ESTUDIANTE', bloqueado: false, celular: '77890123', fechaNacimiento: '2007-08-25',
    matriculas: matriculas(2026, 1, true), resultados: [], requisitos: { TACFI: P, TCLO: P, CERT_NOTAS: P },
  },
  {
    id: 8, ci: '7089012', nombres: 'Gladys', apellidos: 'Poma Choque',
    codigo: 'EST-2022-0034', especialidad: 'Comunicación y Lenguajes', anioIngreso: 2022,
    condicion: 'ESTUDIANTE', bloqueado: false, celular: '78901234', fechaNacimiento: '2002-11-09',
    matriculas: matriculas(2022, 5, true), resultados: resultados([0, 1, 0, 0]), requisitos: completos('1133', 'Avanzado'),
  },
  // ── Maestros egresados ────────────────────────────────────────────────
  {
    id: 9, ci: '6098765', nombres: 'Lucía', apellidos: 'Flores Alanoca',
    codigo: 'EST-2020-0012', especialidad: 'Educación Primaria Comunitaria Vocacional', anioIngreso: 2020,
    condicion: 'EGRESADO', bloqueado: false, celular: '69876543', correo: 'lucia.flores@gmail.com', fechaNacimiento: '1999-04-12',
    matriculas: matriculas(2020, 5, false), resultados: resultados([0, 0, 1, 0, 0]), requisitos: completos('0871', 'Avanzado'),
  },
  {
    id: 10, ci: '6087654', nombres: 'Marco Antonio', apellidos: 'Quispe Ramos',
    codigo: 'EST-2019-0044', especialidad: 'Matemática', anioIngreso: 2019,
    condicion: 'EGRESADO', bloqueado: false, celular: '68765432', fechaNacimiento: '1998-10-01',
    matriculas: matriculas(2019, 5, false), resultados: resultados([0, 1, 0, 0, 0]), requisitos: completos('0790'),
  },
  {
    id: 11, ci: '6076543', nombres: 'Elena', apellidos: 'Cruz Mamani',
    codigo: 'EST-2020-0031', especialidad: 'Ciencias Naturales: Biología-Geografía', anioIngreso: 2020,
    condicion: 'EGRESADO', bloqueado: false, celular: '67654321', fechaNacimiento: '1999-06-27',
    matriculas: matriculas(2020, 5, false), resultados: resultados([0, 0, 0, 0, 0]), requisitos: completos('0866'),
  },
  {
    id: 12, ci: '6065432', nombres: 'Víctor Hugo', apellidos: 'Tarqui Paco',
    codigo: 'EST-2021-0019', especialidad: 'Educación Física y Deportes', anioIngreso: 2021,
    condicion: 'EGRESADO', bloqueado: false, celular: '66543210', fechaNacimiento: '2000-02-15',
    matriculas: matriculas(2021, 5, false), resultados: resultados([1, 0, 2, 0, 0]),
    requisitos: { TACFI: { estado: 'COMPLETO', fecha: '2025-10-28', responsable: 'María Quispe Mamani' }, TCLO: P, CERT_NOTAS: { estado: 'COMPLETO', nro: 'CN-4980', fecha: '2026-01-20' } },
  },
  {
    id: 13, ci: '6054321', nombres: 'Betty', apellidos: 'Yujra Calle',
    codigo: 'EST-2020-0057', especialidad: 'Comunicación y Lenguajes', anioIngreso: 2020,
    condicion: 'EGRESADO', bloqueado: true, motivoBloqueo: '4 UF reprobadas en 4.º año (límite: 2)',
    celular: '65432109', fechaNacimiento: '1999-12-30',
    matriculas: matriculas(2020, 5, false), resultados: resultados([0, 1, 0, 4, 0]), requisitos: completos('0902'),
  },
];
