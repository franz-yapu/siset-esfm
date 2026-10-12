import type { Dictamen, DocumentoEmitido, EstadoTramite, HojaRuta, Movimiento, TipoTramite } from '@/types';
import { haceDias } from '@/lib/formato';

const ROSA = 'Rosa Choque Apaza';
const ANA = 'Ana Ticona Laura';
const MARIA = 'María Quispe Mamani';
const PEDRO = 'Lic. Pedro Huanca';

/** Recorrido normal del trámite: quién actúa y en qué sede (PRD §3). */
const CAMINO: { estado: EstadoTramite; sedeId: number; usuario: string; obs?: string }[] = [
  { estado: 'REGISTRADO', sedeId: 1, usuario: ROSA },
  { estado: 'EN_TRANSITO_ANC', sedeId: 1, usuario: ROSA, obs: 'Pase a UA Ancocagua' },
  { estado: 'RECIBIDO', sedeId: 2, usuario: ANA },
  { estado: 'EN_REVISION', sedeId: 2, usuario: MARIA },
  { estado: 'DICTAMINADO', sedeId: 2, usuario: PEDRO, obs: 'Dictamen: Aprobado' },
  { estado: 'EN_IMPRESION', sedeId: 2, usuario: MARIA },
  { estado: 'EN_TRANSITO_LP', sedeId: 2, usuario: MARIA, obs: 'Pase de retorno a La Paz' },
  { estado: 'EN_FIRMA', sedeId: 1, usuario: ROSA },
  { estado: 'LISTO', sedeId: 1, usuario: ROSA },
  { estado: 'ENTREGADO', sedeId: 1, usuario: ROSA, obs: 'Entregado al titular' },
];

/**
 * Genera los movimientos de un trámite hasta `hasta`, empezando `inicio` días atrás
 * y avanzando un paso cada `ritmo` días.
 */
const recorrido = (hasta: EstadoTramite, inicio: number, ritmo = 1, valorado = ''): Movimiento[] => {
  const fin = CAMINO.findIndex((p) => p.estado === hasta);
  return CAMINO.slice(0, fin + 1).map((p, i) => {
    const dias = Math.max(inicio - Math.round(i * ritmo), 0);
    const hora = `${String(8 + (i % 8)).padStart(2, '0')}:${String((i * 17) % 60).padStart(2, '0')}`;
    const obs = p.estado === 'EN_TRANSITO_ANC' && valorado ? `Valorado N.º ${valorado}` : p.obs;
    return { ...p, obs, fecha: haceDias(dias, hora) };
  });
};

const hr = (
  n: number, fileId: number, tipo: TipoTramite, estado: EstadoTramite, inicio: number, ritmo = 1, extra: Partial<HojaRuta> = {},
): HojaRuta => {
  const nroValorado = String(4400 + n).padStart(6, '0');
  const movimientos = recorrido(estado === 'OBSERVADO' ? 'EN_REVISION' : estado, inicio, ritmo, nroValorado);
  return {
    nro: `HR-2026-000${n}`, fileId, tipo, estado, nroValorado,
    sedeActualId: movimientos[movimientos.length - 1].sedeId,
    fechaIngreso: movimientos[0].fecha,
    movimientos,
    ...extra,
  };
};

export const seedHojasRuta = (): HojaRuta[] => {
  const lista: HojaRuta[] = [
    hr(110, 10, 'Historial académico', 'ENTREGADO', 26, 2.3, { entrega: { entregadoA: 'Titular', ciReceptor: '6087654', fecha: haceDias(3, '11:20') } }),
    hr(111, 11, 'Historial académico', 'EN_TRANSITO_LP', 19, 2.4),
    hr(112, 11, 'Certificación', 'LISTO', 22, 2.4),
    hr(113, 9, 'Copia legalizada', 'EN_FIRMA', 18, 2.1),
    hr(114, 10, 'Certificación', 'EN_TRANSITO_LP', 15, 1.9),
    hr(115, 11, 'Copia legalizada', 'EN_IMPRESION', 14, 2.2),
    hr(116, 9, 'Certificación', 'DICTAMINADO', 12, 2.4),
    hr(117, 10, 'Copia legalizada', 'EN_REVISION', 11, 2.5, { enviadoDictamen: true }),
    hr(118, 12, 'Historial académico', 'OBSERVADO', 16, 1.2),
    hr(119, 12, 'Copia legalizada', 'RECIBIDO', 4, 1.5),
    hr(120, 10, 'Historial académico', 'EN_TRANSITO_ANC', 11, 0.5),
    hr(121, 12, 'Certificación', 'EN_TRANSITO_ANC', 2, 1),
    hr(122, 11, 'Copia legalizada', 'EN_TRANSITO_ANC', 1, 1),
    hr(123, 9, 'Historial académico', 'EN_REVISION', 14, 1.3),
    hr(124, 10, 'Copia legalizada', 'REGISTRADO', 0, 0),
  ];
  // El observado lleva su paso de observación con el motivo.
  const obs = lista.find((h) => h.nro === 'HR-2026-000118');
  obs?.movimientos.push({ estado: 'OBSERVADO', fecha: haceDias(12, '15:40'), sedeId: 2, usuario: MARIA, obs: 'Falta certificado TCLO' });
  return lista;
};

/** Dictámenes de los trámites que ya pasaron por el Coordinador. */
export const seedDictamenes = (hojas: HojaRuta[]): Dictamen[] =>
  hojas
    .map((h) => ({ h, m: h.movimientos.find((m) => m.estado === 'DICTAMINADO') }))
    .filter((x): x is { h: HojaRuta; m: Movimiento } => Boolean(x.m))
    .map(({ h, m }) => ({ nro: h.nro, resultado: 'APROBADO', obs: 'Requisitos completos, sin observaciones.', fecha: m.fecha, coordinador: PEDRO }));

const TIPO_DOC: Record<TipoTramite, DocumentoEmitido['tipo']> = {
  'Historial académico': 'HISTORIAL',
  'Copia legalizada': 'HISTORIAL',
  'Certificación': 'TCLO',
};
export const tipoDocumento = (tipo: TipoTramite): DocumentoEmitido['tipo'] => TIPO_DOC[tipo];

/** Documentos ya emitidos (todo trámite que pasó de En impresión). */
export const seedDocumentos = (hojas: HojaRuta[]): DocumentoEmitido[] => {
  let id = 0;
  return hojas
    .map((h) => ({ h, m: h.movimientos.find((m) => m.estado === 'EN_IMPRESION') }))
    .filter((x): x is { h: HojaRuta; m: Movimiento } => Boolean(x.m))
    .map(({ h, m }) => ({
      id: ++id, nro: h.nro, tipo: TIPO_DOC[h.tipo], nroValorado: `V-${String(81200 + id * 7)}`,
      usuario: MARIA, fecha: m.fecha, esReimpresion: false,
    }));
};
