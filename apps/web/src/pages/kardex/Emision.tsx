import { BandejaKardex, type BandejaKardexTab } from '@/components/hojas/BandejaKardex';

const TABS: readonly BandejaKardexTab[] = [
  {
    estado: 'EN_IMPRESION',
    label: 'Por imprimir',
    esperando: 'Falta marcarlo como impreso (o, en el historial, devolverlo con observación).',
  },
  {
    estado: 'IMPRESO',
    label: 'Impresos',
    esperando: 'Impreso: espera la firma del Coordinador (certificados) o de Dirección Académica (historial).',
  },
  {
    estado: 'DEVUELTO',
    label: 'Devueltos',
    esperando: 'Devuelto con observación: el trámite terminó en SISET; el egresado debe hacer otro trámite.',
  },
];

/**
 * P-44 · Impresión (KARDEX) contra la API. Kardex imprime como hoy y el sistema anota el paso IMPRIMIR con quién y
 * cuándo; el historial lo genera el sistema del Ministerio (D-48). Antes de imprimir el historial, Kardex contrasta
 * las notas con los empastes y, si algo no coincide, lo devuelve con observación (DEC-053, ADR-0008). DEC-041.
 */
export function Emision() {
  return (
    <BandejaKardex
      titulo="Impresión"
      subtitulo="Trámites que Kardex recogió y tiene que imprimir. El file bloqueado no deja imprimir; el historial con observación se devuelve."
      tabs={TABS}
    />
  );
}
