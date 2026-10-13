import type { HojaRuta, RegistroBitacora, Usuario } from '@/types';
import { ESTADOS } from '@/config/estados';
import { haceDias } from '@/lib/formato';

const IPS: Record<string, string> = {
  'Rosa Choque Apaza': '10.10.1.24',
  'Ana Ticona Laura': '10.20.1.15',
  'María Quispe Mamani': '10.20.1.11',
  'Lic. Pedro Huanca': '10.20.1.12',
};
export const ipDe = (nombre: string): string => IPS[nombre] ?? '181.115.140.37';

/** Bitácora inicial: cada movimiento de las hojas de ruta + algunos eventos de sesión y de files. */
export const seedBitacora = (hojas: HojaRuta[], usuarios: Usuario[]): RegistroBitacora[] => {
  const desdeMovimientos = hojas.flatMap((h) =>
    h.movimientos.map((m, i) => {
      const anterior = i > 0 ? h.movimientos[i - 1].estado : null;
      return {
        fecha: m.fecha,
        usuario: m.usuario,
        ip: ipDe(m.usuario),
        modulo:
          i === 0
            ? 'Hojas de ruta'
            : m.estado.startsWith('EN_TRANSITO') || m.estado === 'RECIBIDO'
              ? 'Pases'
              : 'Hojas de ruta',
        accion: i === 0 ? 'Registrar hoja de ruta' : `Cambiar estado a "${ESTADOS[m.estado].etiqueta}"`,
        registro: h.nro,
        antes: anterior ? { estado: anterior } : null,
        despues: { estado: m.estado, ...(m.obs ? { observacion: m.obs } : {}) },
      };
    }),
  );
  const nombre = (u: string) => usuarios.find((x) => x.usuario === u)?.nombre ?? u;
  const otros = [
    {
      fecha: haceDias(0, '08:05'),
      usuario: nombre('kardex'),
      ip: '10.20.1.11',
      modulo: 'Seguridad',
      accion: 'Inicio de sesión',
      registro: 'kardex',
      antes: null,
      despues: null,
    },
    {
      fecha: haceDias(0, '08:30'),
      usuario: nombre('secdir'),
      ip: '10.10.1.24',
      modulo: 'Seguridad',
      accion: 'Inicio de sesión',
      registro: 'secdir',
      antes: null,
      despues: null,
    },
    {
      fecha: haceDias(3, '09:20'),
      usuario: 'cvargas',
      ip: '10.10.1.31',
      modulo: 'Seguridad',
      accion: 'Cuenta bloqueada por 5 intentos fallidos',
      registro: 'cvargas',
      antes: { intentos: 4 },
      despues: { intentos: 5, bloqueado: true },
    },
    {
      fecha: haceDias(9, '10:12'),
      usuario: nombre('kardex'),
      ip: '10.20.1.11',
      modulo: 'Files',
      accion: 'Registrar resultado anual',
      registro: 'EST-2024-0063',
      antes: { bloqueado: false, ufReprobadas2: null },
      despues: { bloqueado: true, ufReprobadas2: 3 },
    },
    {
      fecha: haceDias(9, '10:13'),
      usuario: 'Sistema',
      ip: '—',
      modulo: 'Files',
      accion: 'Bloquear file',
      registro: 'EST-2024-0063',
      antes: { bloqueado: false },
      despues: { bloqueado: true, motivo: '3 UF reprobadas en 2.º año (límite: 2)' },
    },
    {
      fecha: haceDias(20, '14:02'),
      usuario: nombre('kardex'),
      ip: '10.20.1.11',
      modulo: 'Files',
      accion: 'Registrar recepción TACFI',
      registro: 'EST-2021-0019',
      antes: { TACFI: 'PENDIENTE' },
      despues: { TACFI: 'COMPLETO' },
    },
    {
      fecha: haceDias(21, '11:30'),
      usuario: nombre('kardex'),
      ip: '10.20.1.11',
      modulo: 'Usuarios',
      accion: 'Dar de baja usuario',
      registro: 'jmendoza',
      antes: { activo: true },
      despues: { activo: false },
    },
    {
      fecha: haceDias(30, '09:00'),
      usuario: nombre('kardex'),
      ip: '10.20.1.11',
      modulo: 'Usuarios',
      accion: 'Resetear contraseña',
      registro: 'seccoord',
      antes: { debeCambiarClave: false },
      despues: { debeCambiarClave: true },
    },
  ];
  return [...desdeMovimientos, ...otros]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((r, i) => ({ ...r, id: i + 1 }));
};
