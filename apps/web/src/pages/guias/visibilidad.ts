import { mostrarCuentasPrueba } from '@/config/cuentas-prueba';

/**
 * La guía de estudio y las preguntas de defensa son material del autor: se ven en el entorno de prueba
 * (VITE_CUENTAS_PRUEBA) y en la demo, no en la instalación de la escuela (DEC-048).
 */
export const guiasDeTesis = (
  cuentasPrueba = import.meta.env.VITE_CUENTAS_PRUEBA,
  demo = import.meta.env.VITE_DEMO,
): boolean => mostrarCuentasPrueba(cuentasPrueba) || demo === 'true';
