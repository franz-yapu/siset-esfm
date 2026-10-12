import type { Usuario } from '@/types';
import { haceDias } from '@/lib/formato';

/** En el prototipo la contraseña de todos es "demo123". */
export const CLAVE_DEMO = 'demo123';

export const seedUsuarios = (): Usuario[] => [
  // Personal
  { id: 1, usuario: 'kardex',      nombre: 'María Quispe Mamani',  rol: 'KARDEX',      sedeId: 2, activo: true, correo: 'kardex@esfm-ancocagua.edu.bo', ultimoAcceso: haceDias(0, '08:05') },
  { id: 2, usuario: 'secdir',      nombre: 'Rosa Choque Apaza',    rol: 'SEC_DIR',     sedeId: 1, activo: true, correo: 'secdir@esfm.edu.bo', ultimoAcceso: haceDias(0, '08:30') },
  { id: 3, usuario: 'seccoord',    nombre: 'Ana Ticona Laura',     rol: 'SEC_COORD',   sedeId: 2, activo: true, correo: 'seccoord@esfm-ancocagua.edu.bo', ultimoAcceso: haceDias(1, '16:10') },
  { id: 4, usuario: 'coordinador', nombre: 'Lic. Pedro Huanca',    rol: 'COORDINADOR', sedeId: 2, activo: true, correo: 'coordinacion@esfm-ancocagua.edu.bo', ultimoAcceso: haceDias(1, '11:45') },
  { id: 5, usuario: 'jmendoza',    nombre: 'Jorge Mendoza Cruz',   rol: 'KARDEX',      sedeId: 2, activo: false, correo: 'jmendoza@esfm-ancocagua.edu.bo', ultimoAcceso: haceDias(64, '10:00') },
  { id: 6, usuario: 'cvargas',     nombre: 'Carmen Vargas Poma',   rol: 'SEC_DIR',     sedeId: 1, activo: true, correo: 'cvargas@esfm.edu.bo', ultimoAcceso: haceDias(3, '09:20'), bloqueadoHasta: haceDias(-1, '10:00') },
  // Estudiantes (usuario = CI)
  { id: 11, usuario: '7012345', nombre: 'Juan Carlos Mamani Condori', rol: 'ESTUDIANTE', sedeId: null, activo: true, fileId: 1, ultimoAcceso: haceDias(2, '19:30') },
  { id: 12, usuario: '7023456', nombre: 'Wilma Copa Quispe',          rol: 'ESTUDIANTE', sedeId: null, activo: true, fileId: 2 },
  { id: 13, usuario: '7034567', nombre: 'Edwin Limachi Huanca',       rol: 'ESTUDIANTE', sedeId: null, activo: true, fileId: 3, ultimoAcceso: haceDias(5, '21:02') },
  { id: 14, usuario: '7045678', nombre: 'Norma Callisaya Ticona',     rol: 'ESTUDIANTE', sedeId: null, activo: true, fileId: 4 },
  { id: 15, usuario: '7056789', nombre: 'Freddy Apaza Nina',          rol: 'ESTUDIANTE', sedeId: null, activo: true, fileId: 5 },
  { id: 16, usuario: '7067890', nombre: 'Sonia Laura Mayta',          rol: 'ESTUDIANTE', sedeId: null, activo: true, fileId: 6 },
  { id: 17, usuario: '7078901', nombre: 'Rubén Chambi Alanoca',       rol: 'ESTUDIANTE', sedeId: null, activo: true, fileId: 7 },
  { id: 18, usuario: '7089012', nombre: 'Gladys Poma Choque',         rol: 'ESTUDIANTE', sedeId: null, activo: true, fileId: 8 },
  // Egresados
  { id: 21, usuario: '6098765', nombre: 'Lucía Flores Alanoca',       rol: 'EGRESADO', sedeId: null, activo: true, fileId: 9, ultimoAcceso: haceDias(1, '20:15') },
  { id: 22, usuario: '6087654', nombre: 'Marco Antonio Quispe Ramos', rol: 'EGRESADO', sedeId: null, activo: true, fileId: 10 },
  { id: 23, usuario: '6076543', nombre: 'Elena Cruz Mamani',          rol: 'EGRESADO', sedeId: null, activo: true, fileId: 11 },
  { id: 24, usuario: '6065432', nombre: 'Víctor Hugo Tarqui Paco',    rol: 'EGRESADO', sedeId: null, activo: true, fileId: 12 },
  { id: 25, usuario: '6054321', nombre: 'Betty Yujra Calle',          rol: 'EGRESADO', sedeId: null, activo: true, fileId: 13 },
];
