import type { EstadoHojaRuta } from '@/types/hojas-ruta';

/**
 * Etiqueta y colores de los 10 estados de ADR-0005 y ADR-0008 (SDD S3.8-S3.9 §2.3), con la paleta verde (DEC-061,
 * DEC-065): verde pálido mientras el trámite avanza, más marcado cuando está listo para entregar, verde lleno al
 * entregar y rojo al devolver. En la insignia llena, el punto va en blanco.
 */
const EN_CURSO = { badge: 'bg-acento-palido text-primario', punto: 'bg-acento' };

export const ESTADOS_HR: Record<EstadoHojaRuta, { etiqueta: string; badge: string; punto: string }> = {
  RECIBIDO: { etiqueta: 'Recibido', ...EN_CURSO },
  AVISADO_KARDEX: { etiqueta: 'Avisado a Kardex', ...EN_CURSO },
  EN_IMPRESION: { etiqueta: 'En impresión', ...EN_CURSO },
  IMPRESO: { etiqueta: 'Impreso', ...EN_CURSO },
  FIRMADO_DIR_ACADEMICA: { etiqueta: 'Firmado por Dir. Académica', ...EN_CURSO },
  FIRMADO_COORDINADOR: { etiqueta: 'Firmado por el Coordinador', ...EN_CURSO },
  REMITIDO_CALAHUMANA: { etiqueta: 'Remitido a Calahumana', ...EN_CURSO },
  LISTO: { etiqueta: 'Listo para entregar', badge: 'bg-[#cfe7da] text-primario-oscuro', punto: 'bg-primario' },
  ENTREGADO: { etiqueta: 'Entregado', badge: 'bg-[#1d6b45] text-white [&>span]:bg-white', punto: 'bg-[#1d6b45]' },
  DEVUELTO: { etiqueta: 'Devuelto con observación', badge: 'bg-[#ffedea] text-[#831c1e]', punto: 'bg-[#c4242a]' },
};

export const NOMBRE_SEDE: Record<string, string> = {
  LA_PAZ: 'Calahumana (La Paz)',
  ANCOCAGUA: 'UA Ancocagua',
};
export const sedeHr = (codigo: string): string => NOMBRE_SEDE[codigo] ?? (codigo || '—');
