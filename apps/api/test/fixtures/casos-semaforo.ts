import type { ColorSemaforo, EstadoParaSemaforo } from '../../src/modulos/files/semaforo';
import type { FileParaReglas, RequisitoParaReglas } from '../../src/modulos/files/requisitos-reglas';

/**
 * Tabla de casos del semáforo (SDD S2.5 §2.1). La usan el test de la API y el de paridad de la web
 * (apps/web/src/lib/semaforo.test.ts): si la regla cambia, cambia en los dos lados o falla.
 */
export const CASOS_SEMAFORO: {
  caso: string;
  bloqueado: boolean;
  estados: EstadoParaSemaforo[];
  atrasado?: boolean;
  color: ColorSemaforo;
}[] = [
  { caso: 'todo completo', bloqueado: false, estados: ['COMPLETO', 'COMPLETO'], color: 'VERDE' },
  { caso: 'sin requisitos obligatorios', bloqueado: false, estados: [], color: 'VERDE' },
  { caso: 'alguno pendiente', bloqueado: false, estados: ['COMPLETO', 'PENDIENTE'], color: 'AMARILLO' },
  { caso: 'todos pendientes', bloqueado: false, estados: ['PENDIENTE', 'PENDIENTE'], color: 'AMARILLO' },
  { caso: 'alguno observado', bloqueado: false, estados: ['PENDIENTE', 'OBSERVADO'], color: 'ROJO' },
  { caso: 'bloqueado con todo completo', bloqueado: true, estados: ['COMPLETO'], color: 'ROJO' },
  { caso: 'bloqueado y pendiente', bloqueado: true, estados: ['PENDIENTE'], color: 'ROJO' },
  // D-31, ADR-0007: un TACFI de un año ya pasado que falta.
  { caso: 'un requisito atrasado', bloqueado: false, estados: ['PENDIENTE'], atrasado: true, color: 'ROJO' },
  { caso: 'pendiente pero no atrasado', bloqueado: false, estados: ['PENDIENTE'], atrasado: false, color: 'AMARILLO' },
];

const req = (o: Partial<RequisitoParaReglas> = {}): RequisitoParaReglas => ({
  obligatorio: true,
  anioFormacion: null,
  porGestion: false,
  soloGenero: null,
  soloModalidad: null,
  ...o,
});
const file = (o: Partial<FileParaReglas> = {}): FileParaReglas => ({
  genero: null,
  modalidad: null,
  anioFormacion: null,
  ...o,
});

/** Qué requisitos se le piden a un file (ADR-0007 §2). La comparten la API y la web. */
export const CASOS_APLICA: { caso: string; requisito: RequisitoParaReglas; file: FileParaReglas; aplica: boolean }[] = [
  { caso: 'sin condición', requisito: req(), file: file(), aplica: true },
  {
    caso: 'libreta militar a un varón',
    requisito: req({ soloGenero: 'MASCULINO' }),
    file: file({ genero: 'MASCULINO' }),
    aplica: true,
  },
  {
    caso: 'libreta militar a una mujer',
    requisito: req({ soloGenero: 'MASCULINO' }),
    file: file({ genero: 'FEMENINO' }),
    aplica: false,
  },
  { caso: 'libreta militar sin género', requisito: req({ soloGenero: 'MASCULINO' }), file: file(), aplica: false },
  { caso: 'B1 a modalidad B1', requisito: req({ soloModalidad: 'B1' }), file: file({ modalidad: 'B1' }), aplica: true },
  {
    caso: 'B1 a modalidad B3',
    requisito: req({ soloModalidad: 'B1' }),
    file: file({ modalidad: 'B3' }),
    aplica: false,
  },
  { caso: '"B" a modalidad B3', requisito: req({ soloModalidad: 'B' }), file: file({ modalidad: 'B3' }), aplica: true },
  { caso: '"B" a modalidad A', requisito: req({ soloModalidad: 'B' }), file: file({ modalidad: 'A' }), aplica: false },
  { caso: 'por modalidad sin modalidad', requisito: req({ soloModalidad: 'B' }), file: file(), aplica: false },
];

/** Resumen de un requisito por gestión (ADR-0007 §2). */
export const CASOS_GESTIONES: { caso: string; estados: EstadoParaSemaforo[]; resumen: EstadoParaSemaforo }[] = [
  { caso: 'sin gestiones', estados: [], resumen: 'PENDIENTE' },
  { caso: 'todas completas', estados: ['COMPLETO', 'COMPLETO'], resumen: 'COMPLETO' },
  { caso: 'una pendiente', estados: ['COMPLETO', 'PENDIENTE'], resumen: 'PENDIENTE' },
  { caso: 'una observada', estados: ['PENDIENTE', 'OBSERVADO'], resumen: 'OBSERVADO' },
];

/** D-31: cuándo un requisito con año está atrasado (ADR-0007 §2). */
export const CASOS_ATRASADO: {
  caso: string;
  anioRequisito: number | null;
  anioFile: number | null;
  estado: EstadoParaSemaforo;
  atrasado: boolean;
}[] = [
  { caso: 'TACFI de 1.º que falta en 3.º', anioRequisito: 1, anioFile: 3, estado: 'PENDIENTE', atrasado: true },
  { caso: 'TACFI de 1.º observado en 2.º', anioRequisito: 1, anioFile: 2, estado: 'OBSERVADO', atrasado: true },
  { caso: 'TACFI de 1.º completo en 3.º', anioRequisito: 1, anioFile: 3, estado: 'COMPLETO', atrasado: false },
  {
    caso: 'TACFI de 3.º que falta en 3.º (le toca este año)',
    anioRequisito: 3,
    anioFile: 3,
    estado: 'PENDIENTE',
    atrasado: false,
  },
  { caso: 'file sin año de formación', anioRequisito: 1, anioFile: null, estado: 'PENDIENTE', atrasado: false },
  { caso: 'requisito sin año', anioRequisito: null, anioFile: 5, estado: 'PENDIENTE', atrasado: false },
];
