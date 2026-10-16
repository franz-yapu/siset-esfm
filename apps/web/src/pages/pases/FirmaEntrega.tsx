import { BandejaKardex, type BandejaKardexTab } from '@/components/hojas/BandejaKardex';

const TABS: readonly BandejaKardexTab[] = [
  {
    estado: 'IMPRESO',
    label: 'Firma de Dirección Académica',
    esperando: 'Falta registrar la firma de Dirección Académica.',
    // Solo el historial y la legalización: los certificados los firma el Coordinador (DEC-040).
    filtro: (h) => h.nroValorado !== null,
  },
  {
    estado: 'FIRMADO_DIR_ACADEMICA',
    label: 'Firma de Dirección General',
    esperando: 'Falta registrar la firma de Dirección General.',
  },
  {
    estado: 'REMITIDO_CALAHUMANA',
    label: 'Por confirmar llegada',
    esperando: 'Kardex lo remitió; falta confirmar que llegó a Calahumana.',
  },
  { estado: 'LISTO', label: 'Por entregar', esperando: 'Listo para entregar al titular o a un familiar.' },
];

/**
 * Firma y entrega (SEC_DIR) contra la API (D-36, DEC-052): las firmas de las Direcciones que anota Secretaría (D-33),
 * la llegada de los certificados remitidos y la entrega al titular o a un familiar de hasta primer grado (D-42).
 */
export function FirmaEntrega() {
  return (
    <BandejaKardex
      titulo="Firma y entrega"
      subtitulo="Trámites que esperan una firma de las Direcciones, la llegada a Calahumana o la entrega."
      tabs={TABS}
      conRequisitos={false}
    />
  );
}
