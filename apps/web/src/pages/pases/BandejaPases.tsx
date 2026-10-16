import { BandejaKardex, type BandejaKardexTab } from '@/components/hojas/BandejaKardex';

const TABS: readonly BandejaKardexTab[] = [
  {
    estado: 'AVISADO_KARDEX',
    label: 'Hacia Ancocagua',
    esperando: 'Secretaría avisó a Kardex; falta que Kardex lo recoja en Calahumana.',
  },
  {
    estado: 'REMITIDO_CALAHUMANA',
    label: 'Hacia Calahumana',
    esperando: 'Kardex lo remitió; falta que Secretaría confirme la llegada.',
  },
];

/**
 * Bandeja de pases contra la API (D-35, D-36, DEC-052): los trámites en camino entre Calahumana y Ancocagua, con quién
 * los mandó, quién los recibió y cuándo. Cada rol ve el paso que le toca (recoger o confirmar la llegada).
 */
export function BandejaPases() {
  return (
    <BandejaKardex
      titulo="Bandeja de pases"
      subtitulo="Trámites en camino entre Calahumana y Ancocagua: quién los mandó, quién los recibió y cuándo."
      tabs={TABS}
      mostrarPases
    />
  );
}
