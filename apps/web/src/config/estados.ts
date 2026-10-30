import type { ColorSemaforo, EstadoTramite } from '@/types';

export const ORDEN_ESTADOS: EstadoTramite[] = [
  'REGISTRADO',
  'EN_TRANSITO_ANC',
  'RECIBIDO',
  'EN_REVISION',
  'OBSERVADO',
  'DICTAMINADO',
  'EN_IMPRESION',
  'EN_TRANSITO_LP',
  'EN_FIRMA',
  'LISTO',
  'ENTREGADO',
];

interface InfoEstado {
  etiqueta: string;
  badge: string;
  punto: string;
}

/** Los estados del prototipo, con el mismo criterio que los de la hoja de ruta: un tono mientras avanza. */
const EN_CURSO = { badge: 'bg-acento-palido text-primario', punto: 'bg-acento' };

export const ESTADOS: Record<EstadoTramite, InfoEstado> = {
  REGISTRADO: { etiqueta: 'Registrado', ...EN_CURSO },
  EN_TRANSITO_ANC: { etiqueta: 'En tránsito a Ancocagua', ...EN_CURSO },
  RECIBIDO: { etiqueta: 'Recibido', ...EN_CURSO },
  EN_REVISION: { etiqueta: 'En revisión', ...EN_CURSO },
  OBSERVADO: { etiqueta: 'Observado', badge: 'bg-[#fffbeb] text-[#92400e]', punto: 'bg-[#d97706]' },
  DICTAMINADO: { etiqueta: 'Dictaminado', ...EN_CURSO },
  EN_IMPRESION: { etiqueta: 'En impresión', ...EN_CURSO },
  EN_TRANSITO_LP: { etiqueta: 'En tránsito a La Paz', ...EN_CURSO },
  EN_FIRMA: { etiqueta: 'En firma', ...EN_CURSO },
  LISTO: { etiqueta: 'Listo para entrega', badge: 'bg-[#cfe7da] text-primario-oscuro', punto: 'bg-primario' },
  ENTREGADO: { etiqueta: 'Entregado', badge: 'bg-[#1d6b45] text-white [&>span]:bg-white', punto: 'bg-[#1d6b45]' },
};

/** Pasos de la barra de progreso (Observado no es un paso, es un desvío). */
export const PASOS_PROGRESO: EstadoTramite[] = ORDEN_ESTADOS.filter((e) => e !== 'OBSERVADO');

export const SEMAFORO: Record<
  ColorSemaforo,
  { texto: string; punto: string; fondo: string; borde: string; tinta: string }
> = {
  VERDE: {
    texto: 'Todo en orden',
    punto: 'bg-green-600',
    fondo: 'bg-green-50',
    borde: 'border-green-200',
    tinta: 'text-green-700',
  },
  AMARILLO: {
    texto: 'Requisitos pendientes',
    punto: 'bg-amber-600',
    fondo: 'bg-amber-50',
    borde: 'border-amber-200',
    tinta: 'text-amber-700',
  },
  ROJO: {
    texto: 'File bloqueado',
    punto: 'bg-red-600',
    fondo: 'bg-red-50',
    borde: 'border-red-200',
    tinta: 'text-red-700',
  },
};
