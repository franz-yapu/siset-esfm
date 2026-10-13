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

export const ESTADOS: Record<EstadoTramite, InfoEstado> = {
  REGISTRADO: { etiqueta: 'Registrado', badge: 'bg-slate-100 text-slate-700 ring-slate-300', punto: 'bg-slate-400' },
  EN_TRANSITO_ANC: {
    etiqueta: 'En tránsito a Ancocagua',
    badge: 'bg-sky-50 text-sky-700 ring-sky-300',
    punto: 'bg-sky-500',
  },
  RECIBIDO: { etiqueta: 'Recibido', badge: 'bg-blue-50 text-blue-700 ring-blue-300', punto: 'bg-blue-600' },
  EN_REVISION: {
    etiqueta: 'En revisión',
    badge: 'bg-indigo-50 text-indigo-700 ring-indigo-300',
    punto: 'bg-indigo-600',
  },
  OBSERVADO: { etiqueta: 'Observado', badge: 'bg-amber-50 text-amber-700 ring-amber-300', punto: 'bg-amber-500' },
  DICTAMINADO: {
    etiqueta: 'Dictaminado',
    badge: 'bg-violet-50 text-violet-700 ring-violet-300',
    punto: 'bg-violet-600',
  },
  EN_IMPRESION: { etiqueta: 'En impresión', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-300', punto: 'bg-cyan-600' },
  EN_TRANSITO_LP: {
    etiqueta: 'En tránsito a La Paz',
    badge: 'bg-sky-50 text-sky-700 ring-sky-300',
    punto: 'bg-sky-500',
  },
  EN_FIRMA: { etiqueta: 'En firma', badge: 'bg-purple-50 text-purple-700 ring-purple-300', punto: 'bg-purple-600' },
  LISTO: { etiqueta: 'Listo para entrega', badge: 'bg-lime-50 text-lime-700 ring-lime-300', punto: 'bg-lime-500' },
  ENTREGADO: { etiqueta: 'Entregado', badge: 'bg-green-50 text-green-700 ring-green-300', punto: 'bg-green-600' },
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
