import { BandejaKardex, type BandejaKardexTab } from '@/components/hojas/BandejaKardex';
import { useUsuario } from '@/hooks';

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

/** Secretaría de Coordinación (D-32b, ADR-0011): los certificados que recibió en Ancocagua. */
const TABS_ANCOCAGUA: readonly BandejaKardexTab[] = [
  {
    estado: 'RECIBIDO',
    label: 'Por derivar a Kardex',
    esperando: 'Recibido en Ancocagua; falta derivarlo a Kardex.',
    filtro: (h) => h.sedeIngreso === 'ANCOCAGUA',
  },
  {
    estado: 'IMPRESO',
    label: 'Por firmar',
    esperando: 'Kardex lo imprimió; falta que lo firme el Coordinador.',
    filtro: (h) => h.sedeIngreso === 'ANCOCAGUA',
  },
  {
    estado: 'FIRMADO_COORDINADOR',
    label: 'Por entregar',
    esperando: 'Firmado por el Coordinador; listo para entregar al titular o a un familiar.',
    filtro: (h) => h.sedeIngreso === 'ANCOCAGUA',
  },
];

/**
 * Firma y entrega contra la API (D-36, DEC-052). SEC_DIR: las firmas de las Direcciones que anota Secretaría (D-33),
 * la llegada de los certificados remitidos y la entrega al titular o a un familiar de hasta primer grado (D-42).
 * SEC_COORD: los certificados recibidos en Ancocagua, que deriva a Kardex y entrega después de la firma (D-32b).
 */
export function FirmaEntrega() {
  const u = useUsuario();
  if (u.rol === 'SEC_COORD') {
    return (
      <BandejaKardex
        titulo="Firma y entrega"
        subtitulo="Certificados recibidos en Ancocagua: derivarlos a Kardex y entregarlos ya firmados por el Coordinador."
        tabs={TABS_ANCOCAGUA}
      />
    );
  }
  return (
    <BandejaKardex
      titulo="Firma y entrega"
      subtitulo="Trámites que esperan una firma de las Direcciones, la llegada a Calahumana o la entrega."
      tabs={TABS}
      conRequisitos={false}
    />
  );
}
