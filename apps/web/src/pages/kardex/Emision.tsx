import { BandejaKardex, type BandejaKardexTab } from '@/components/hojas/BandejaKardex';

const TABS: readonly BandejaKardexTab[] = [
  { estado: 'EN_IMPRESION', label: 'Por imprimir', esperando: 'Falta marcarlo como impreso.' },
  {
    estado: 'IMPRESO',
    label: 'Impresos',
    esperando: 'Impreso: espera la firma del Coordinador (certificados) o de Dirección Académica (historial).',
  },
];

/**
 * P-44 · Impresión (KARDEX) contra la API. Kardex imprime como hoy y el sistema anota el paso IMPRIMIR con quién y
 * cuándo; generar el documento desde SISET espera D-39 y los formatos oficiales (D-10). DEC-041.
 */
export function Emision() {
  return (
    <BandejaKardex
      titulo="Impresión"
      subtitulo="Trámites que Kardex recogió y tiene que imprimir. El file bloqueado no deja imprimir."
      tabs={TABS}
    />
  );
}
