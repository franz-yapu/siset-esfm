/**
 * El camino de un trámite con valorado (ADR-0005), contado para quien no conoce el sistema: en la entrada y en la
 * consulta pública.
 */
export const CAMINO = [
  { paso: 'Recibido', donde: 'Secretaría de Dirección General · Calahumana' },
  { paso: 'Kardex lo recoge e imprime', donde: 'Archivo Kardex · UA Ancocagua' },
  { paso: 'Firmas', donde: 'Dirección Académica o Coordinación' },
  { paso: 'Remitido a Calahumana', donde: 'Por la bandeja de pases' },
  { paso: 'Entregado', donde: 'Al titular o a un familiar de primer grado' },
] as const;
