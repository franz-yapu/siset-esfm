import { BandejaKardex, type BandejaKardexTab } from '@/components/hojas/BandejaKardex';

const TABS: readonly BandejaKardexTab[] = [
  {
    estado: 'AVISADO_KARDEX',
    label: 'Por recoger',
    esperando: 'Secretaría avisó; falta registrar que Kardex lo recogió.',
  },
  {
    estado: 'FIRMADO_COORDINADOR',
    label: 'Por remitir',
    esperando: 'El Coordinador ya firmó; falta remitirlo a Calahumana.',
    // Los recibidos en Ancocagua no se remiten: los entrega Secretaría de Coordinación (ADR-0011).
    filtro: (h) => h.sedeIngreso === 'LA_PAZ',
  },
];

/**
 * P-43 · Recojo y remisión (KARDEX) contra la API. Sin revisión aparte ni "Observado" (D-34, propuesta): Kardex
 * registra que recogió el trámite en Calahumana y que remitió los certificados firmados (DEC-033, DEC-041).
 */
export function Revision() {
  return (
    <BandejaKardex
      titulo="Recojo y remisión"
      subtitulo="Trámites que Kardex tiene que recoger en Calahumana o remitir ya firmados."
      tabs={TABS}
    />
  );
}
