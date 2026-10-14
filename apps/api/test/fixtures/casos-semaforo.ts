import type { ColorSemaforo, EstadoParaSemaforo } from '../../src/modulos/files/semaforo';

/**
 * Tabla de casos del semáforo (SDD S2.5 §2.1). La usan el test de la API y el de paridad de la web
 * (apps/web/src/lib/semaforo.test.ts): si la regla cambia, cambia en los dos lados o falla.
 */
export const CASOS_SEMAFORO: {
  caso: string;
  bloqueado: boolean;
  estados: EstadoParaSemaforo[];
  color: ColorSemaforo;
}[] = [
  { caso: 'todo completo', bloqueado: false, estados: ['COMPLETO', 'COMPLETO'], color: 'VERDE' },
  { caso: 'sin requisitos obligatorios', bloqueado: false, estados: [], color: 'VERDE' },
  { caso: 'alguno pendiente', bloqueado: false, estados: ['COMPLETO', 'PENDIENTE'], color: 'AMARILLO' },
  { caso: 'todos pendientes', bloqueado: false, estados: ['PENDIENTE', 'PENDIENTE'], color: 'AMARILLO' },
  { caso: 'alguno observado', bloqueado: false, estados: ['PENDIENTE', 'OBSERVADO'], color: 'ROJO' },
  { caso: 'bloqueado con todo completo', bloqueado: true, estados: ['COMPLETO'], color: 'ROJO' },
  { caso: 'bloqueado y pendiente', bloqueado: true, estados: ['PENDIENTE'], color: 'ROJO' },
];
