import type { Usuario } from '@/types';
import { haceDias } from '@/lib/formato';

/** En el prototipo la contraseña de todos es "demo123". */
export const CLAVE_DEMO = 'demo123';

/**
 * Cuenta del mock con los datos personales que la API guarda en `persona`
 * (SDD S1.13 §2.3). Son opcionales para que `auth.mock` y `files.service`
 * sigan usando `Usuario` sin cambios.
 */
export type UsuarioMock = Usuario & {
  ci?: string;
  complemento?: string;
  nombres?: string;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  celular?: string | null;
};

/** Datos personales del personal de la demo (el `usuario` de la demo se queda: lo usan los botones de prueba). */
const persona = (
  ci: string,
  nombres: string,
  apellidoPaterno: string | null,
  apellidoMaterno: string | null,
  celular: string | null = null,
) => ({ ci, complemento: '', nombres, apellidoPaterno, apellidoMaterno, celular });

export const seedUsuarios = (): UsuarioMock[] => [
  // Personal
  {
    ...persona('4812345', 'María', 'Quispe', 'Mamani', '71234501'),
    id: 1,
    usuario: 'kardex',
    nombre: 'María Quispe Mamani',
    rol: 'KARDEX',
    sedeId: 2,
    activo: true,
    correo: 'kardex@esfm-ancocagua.edu.bo',
    ultimoAcceso: haceDias(0, '08:05'),
  },
  {
    ...persona('3456789', 'Rosa', 'Choque', 'Apaza', '71234502'),
    id: 2,
    usuario: 'secdir',
    nombre: 'Rosa Choque Apaza',
    rol: 'SEC_DIR',
    sedeId: 1,
    activo: true,
    correo: 'secdir@esfm.edu.bo',
    ultimoAcceso: haceDias(0, '08:30'),
  },
  {
    ...persona('5123456', 'Ana', 'Ticona', 'Laura', '71234503'),
    id: 3,
    usuario: 'seccoord',
    nombre: 'Ana Ticona Laura',
    rol: 'SEC_COORD',
    sedeId: 2,
    activo: true,
    correo: 'seccoord@esfm-ancocagua.edu.bo',
    ultimoAcceso: haceDias(1, '16:10'),
  },
  {
    ...persona('4398765', 'Pedro', 'Huanca', null, '71234504'),
    id: 4,
    usuario: 'coordinador',
    nombre: 'Lic. Pedro Huanca',
    rol: 'COORDINADOR',
    sedeId: 2,
    activo: true,
    correo: 'coordinacion@esfm-ancocagua.edu.bo',
    ultimoAcceso: haceDias(1, '11:45'),
  },
  {
    ...persona('6234567', 'Jorge', 'Mendoza', 'Cruz'),
    id: 5,
    usuario: 'jmendoza',
    nombre: 'Jorge Mendoza Cruz',
    rol: 'KARDEX',
    sedeId: 2,
    activo: false,
    correo: 'jmendoza@esfm-ancocagua.edu.bo',
    ultimoAcceso: haceDias(64, '10:00'),
  },
  {
    ...persona('3987654', 'Carmen', 'Vargas', 'Poma'),
    id: 6,
    usuario: 'cvargas',
    nombre: 'Carmen Vargas Poma',
    rol: 'SEC_DIR',
    sedeId: 1,
    activo: true,
    correo: 'cvargas@esfm.edu.bo',
    ultimoAcceso: haceDias(3, '09:20'),
    bloqueadoHasta: haceDias(-1, '10:00'),
  },
  // Estudiantes (usuario = CI)
  {
    id: 11,
    usuario: '7012345',
    nombre: 'Juan Carlos Mamani Condori',
    rol: 'ESTUDIANTE',
    sedeId: null,
    activo: true,
    fileId: 1,
    ultimoAcceso: haceDias(2, '19:30'),
  },
  { id: 12, usuario: '7023456', nombre: 'Wilma Copa Quispe', rol: 'ESTUDIANTE', sedeId: null, activo: true, fileId: 2 },
  {
    id: 13,
    usuario: '7034567',
    nombre: 'Edwin Limachi Huanca',
    rol: 'ESTUDIANTE',
    sedeId: null,
    activo: true,
    fileId: 3,
    ultimoAcceso: haceDias(5, '21:02'),
  },
  {
    id: 14,
    usuario: '7045678',
    nombre: 'Norma Callisaya Ticona',
    rol: 'ESTUDIANTE',
    sedeId: null,
    activo: true,
    fileId: 4,
  },
  { id: 15, usuario: '7056789', nombre: 'Freddy Apaza Nina', rol: 'ESTUDIANTE', sedeId: null, activo: true, fileId: 5 },
  { id: 16, usuario: '7067890', nombre: 'Sonia Laura Mayta', rol: 'ESTUDIANTE', sedeId: null, activo: true, fileId: 6 },
  {
    id: 17,
    usuario: '7078901',
    nombre: 'Rubén Chambi Alanoca',
    rol: 'ESTUDIANTE',
    sedeId: null,
    activo: true,
    fileId: 7,
  },
  {
    id: 18,
    usuario: '7089012',
    nombre: 'Gladys Poma Choque',
    rol: 'ESTUDIANTE',
    sedeId: null,
    activo: true,
    fileId: 8,
  },
  // Sin egresados: no tienen cuenta (D-08, DEC-032); su trámite se sigue en /seguimiento.
];
