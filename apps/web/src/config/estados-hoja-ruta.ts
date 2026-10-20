import type { EstadoHojaRuta } from '@/types/hojas-ruta';

/**
 * Etiqueta y colores de los 10 estados de ADR-0005 y ADR-0008 (SDD S3.8-S3.9 §2.3). Una máquina de estados usa un solo
 * tono (tasteskill, app screens §7.6): gris pálido mientras el trámite avanza, azul pálido cuando está listo para
 * entregar, y los pares de estado solo al cerrar (entregado en verde, devuelto en rojo). El punto marca el avance.
 */
const EN_CURSO = { badge: 'bg-[#eef1f4] text-[#2b3440]', punto: 'bg-primario' };

export const ESTADOS_HR: Record<EstadoHojaRuta, { etiqueta: string; badge: string; punto: string }> = {
  RECIBIDO: { etiqueta: 'Recibido', ...EN_CURSO },
  AVISADO_KARDEX: { etiqueta: 'Avisado a Kardex', ...EN_CURSO },
  EN_IMPRESION: { etiqueta: 'En impresión', ...EN_CURSO },
  IMPRESO: { etiqueta: 'Impreso', ...EN_CURSO },
  FIRMADO_DIR_ACADEMICA: { etiqueta: 'Firmado por Dir. Académica', ...EN_CURSO },
  FIRMADO_COORDINADOR: { etiqueta: 'Firmado por el Coordinador', ...EN_CURSO },
  REMITIDO_CALAHUMANA: { etiqueta: 'Remitido a Calahumana', ...EN_CURSO },
  LISTO: { etiqueta: 'Listo para entregar', badge: 'bg-[#e4edf6] text-[#173b5c]', punto: 'bg-primario' },
  ENTREGADO: { etiqueta: 'Entregado', badge: 'bg-[#dcfae5] text-[#04250e]', punto: 'bg-[#247b50]' },
  DEVUELTO: { etiqueta: 'Devuelto con observación', badge: 'bg-[#ffedea] text-[#831c1e]', punto: 'bg-[#c4242a]' },
};

export const NOMBRE_SEDE: Record<string, string> = {
  LA_PAZ: 'Calahumana (La Paz)',
  ANCOCAGUA: 'UA Ancocagua',
};
export const sedeHr = (codigo: string): string => NOMBRE_SEDE[codigo] ?? (codigo || '—');
