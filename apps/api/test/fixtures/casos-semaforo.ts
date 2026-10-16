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
  soloAniosTerminados: false,
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
  // D-45: las modalidades son exactas; una lista vale para cada una de ellas.
  {
    caso: 'B1,B2,B3 a modalidad B2',
    requisito: req({ soloModalidad: 'B1,B2,B3' }),
    file: file({ modalidad: 'B2' }),
    aplica: true,
  },
  {
    caso: 'B1,B2,B3 a modalidad A',
    requisito: req({ soloModalidad: 'B1,B2,B3' }),
    file: file({ modalidad: 'A' }),
    aplica: false,
  },
  { caso: 'por modalidad sin modalidad', requisito: req({ soloModalidad: 'B1' }), file: file(), aplica: false },
];

/** Resumen de un requisito por gestión (ADR-0007 §2, D-47): sus estados y cuántos años distintos cubre. */
export const CASOS_GESTIONES: {
  caso: string;
  gestiones: { gestion: string; estado: EstadoParaSemaforo }[];
  esperadas: number;
  resumen: EstadoParaSemaforo;
}[] = [
  { caso: 'sin gestiones', gestiones: [], esperadas: 1, resumen: 'PENDIENTE' },
  { caso: 'sin gestiones y ninguna esperada', gestiones: [], esperadas: 0, resumen: 'COMPLETO' },
  {
    caso: 'todas completas',
    gestiones: [
      { gestion: '2023', estado: 'COMPLETO' },
      { gestion: 'I/2024', estado: 'COMPLETO' },
    ],
    esperadas: 2,
    resumen: 'COMPLETO',
  },
  {
    caso: 'dos semestres del mismo año cuentan como un año',
    gestiones: [
      { gestion: 'I/2025', estado: 'COMPLETO' },
      { gestion: 'II/2025', estado: 'COMPLETO' },
    ],
    esperadas: 2,
    resumen: 'PENDIENTE',
  },
  {
    caso: 'una pendiente',
    gestiones: [
      { gestion: '2024', estado: 'COMPLETO' },
      { gestion: '2025', estado: 'PENDIENTE' },
    ],
    esperadas: 1,
    resumen: 'PENDIENTE',
  },
  {
    caso: 'una observada',
    gestiones: [
      { gestion: '2024', estado: 'PENDIENTE' },
      { gestion: '2025', estado: 'OBSERVADO' },
    ],
    esperadas: 1,
    resumen: 'OBSERVADO',
  },
];

/** D-47 (provisional hasta D-47b): años que debe cubrir un por gestión según el año de formación. */
export const CASOS_ESPERADAS: { caso: string; anioFile: number | null; soloTerminados: boolean; esperadas: number }[] =
  [
    { caso: 'matrícula en 3.º: tres años', anioFile: 3, soloTerminados: false, esperadas: 3 },
    { caso: 'certificado de notas en 3.º: dos años terminados', anioFile: 3, soloTerminados: true, esperadas: 2 },
    { caso: 'certificado de notas en 1.º: ninguno todavía', anioFile: 1, soloTerminados: true, esperadas: 0 },
    { caso: 'sin año de formación: basta con uno', anioFile: null, soloTerminados: true, esperadas: 1 },
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
