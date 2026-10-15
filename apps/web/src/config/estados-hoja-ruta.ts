import type { EstadoHojaRuta } from '@/types/hojas-ruta';

/** Etiqueta y colores de los 9 estados de ADR-0005 (SDD S3.8-S3.9 §2.3). */
export const ESTADOS_HR: Record<EstadoHojaRuta, { etiqueta: string; badge: string; punto: string }> = {
  RECIBIDO: { etiqueta: 'Recibido', badge: 'bg-blue-50 text-blue-700 ring-blue-300', punto: 'bg-blue-600' },
  AVISADO_KARDEX: {
    etiqueta: 'Avisado a Kardex',
    badge: 'bg-sky-50 text-sky-700 ring-sky-300',
    punto: 'bg-sky-500',
  },
  EN_IMPRESION: { etiqueta: 'En impresión', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-300', punto: 'bg-cyan-600' },
  IMPRESO: { etiqueta: 'Impreso', badge: 'bg-indigo-50 text-indigo-700 ring-indigo-300', punto: 'bg-indigo-600' },
  FIRMADO_DIR_ACADEMICA: {
    etiqueta: 'Firmado por Dir. Académica',
    badge: 'bg-violet-50 text-violet-700 ring-violet-300',
    punto: 'bg-violet-600',
  },
  FIRMADO_COORDINADOR: {
    etiqueta: 'Firmado por el Coordinador',
    badge: 'bg-violet-50 text-violet-700 ring-violet-300',
    punto: 'bg-violet-600',
  },
  REMITIDO_CALAHUMANA: {
    etiqueta: 'Remitido a Calahumana',
    badge: 'bg-amber-50 text-amber-700 ring-amber-300',
    punto: 'bg-amber-500',
  },
  LISTO: { etiqueta: 'Listo para entregar', badge: 'bg-teal-50 text-teal-700 ring-teal-300', punto: 'bg-teal-600' },
  ENTREGADO: { etiqueta: 'Entregado', badge: 'bg-green-50 text-green-700 ring-green-300', punto: 'bg-green-600' },
};

export const NOMBRE_SEDE: Record<string, string> = {
  LA_PAZ: 'Calahumana (La Paz)',
  ANCOCAGUA: 'Ancocagua',
};
export const sedeHr = (codigo: string): string => NOMBRE_SEDE[codigo] ?? (codigo || '—');
