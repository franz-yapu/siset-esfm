import type { Rol } from '@/types';

// Cuentas de prueba que el login muestra en el despliegue de prueba (SDD S0.12 §2.5). Son ficticias y las carga
// `bd:datos-prueba`, que también las repara en cada despliegue con la misma contraseña común.

/** Solo el build de la prueba (workflow "Publicar imágenes") pone VITE_CUENTAS_PRUEBA=true. */
export const mostrarCuentasPrueba = (valor: string | undefined): boolean => valor === 'true';

export const PASSWORD_PRUEBA = 'Prueba.2026';

export interface CuentaPrueba {
  usuario: string;
  nombre: string;
  rol: Rol;
  sede: string;
}

export const CUENTAS_PRUEBA: readonly CuentaPrueba[] = [
  { usuario: '9000001', nombre: 'Kardex Prueba', rol: 'KARDEX', sede: 'Ancocagua' },
  { usuario: '9000002', nombre: 'Secretaría Dirección', rol: 'SEC_DIR', sede: 'La Paz' },
  { usuario: '9000003', nombre: 'Secretaría Coordinación', rol: 'SEC_COORD', sede: 'Ancocagua' },
  { usuario: '9000004', nombre: 'Coordinador Académico', rol: 'COORDINADOR', sede: 'Ancocagua' },
  // Estudiante sin sede (D-24): su file es el PRB-0025 de los datos de prueba (DEC-043).
  { usuario: '8100025', nombre: 'Nancy Condori Flores', rol: 'ESTUDIANTE', sede: '—' },
];
