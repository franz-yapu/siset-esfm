// Copia de apps/api/src/modulos/hojas-ruta/maquina.ts para el mock de la demo (SDD S3.8-S3.9 §2.1, DEC-037).
// La de la API manda (do-not-touch, ADR-0005): si cambia allá, se copia acá.

import type { AccionHojaRuta, EstadoHojaRuta } from '@/types/hojas-ruta';

/** Con valorado: historial y legalización. Sin valorado: certificados (D-05). */
export type Flujo = 'CON_VALORADO' | 'SIN_VALORADO';
export type CodigoSede = 'LA_PAZ' | 'ANCOCAGUA';
export type RolHojaRuta = 'SEC_DIR' | 'KARDEX' | 'COORDINADOR';

export interface Transicion {
  accion: AccionHojaRuta;
  etiqueta: string;
  desde: EstadoHojaRuta;
  hacia: EstadoHojaRuta;
  flujos: readonly Flujo[];
  /** Solo para estos tipos de trámite (código); sin la lista, para todos los del flujo. */
  soloTipos?: readonly string[];
  rol: RolHojaRuta;
  /** Sede desde la que se registra el paso. LA_PAZ es la ESFM en Calahumana (D-15). */
  sede: CodigoSede;
  /** El file bloqueado impide el paso (DEC-029): hasta imprimir. */
  impideBloqueo: boolean;
}

const AMBOS = ['CON_VALORADO', 'SIN_VALORADO'] as const;

/** La tabla del §2.2. Los pasos de Dirección Académica y General los anota SEC_DIR (D-33, propuesta). */
export const TRANSICIONES: readonly Transicion[] = [
  {
    accion: 'AVISAR_KARDEX',
    etiqueta: 'Avisar a Kardex',
    desde: 'RECIBIDO',
    hacia: 'AVISADO_KARDEX',
    flujos: AMBOS,
    rol: 'SEC_DIR',
    sede: 'LA_PAZ',
    impideBloqueo: true,
  },
  {
    accion: 'RECOGER',
    etiqueta: 'Registrar que Kardex lo recogió',
    desde: 'AVISADO_KARDEX',
    hacia: 'EN_IMPRESION',
    flujos: AMBOS,
    rol: 'KARDEX',
    sede: 'ANCOCAGUA',
    impideBloqueo: true,
  },
  {
    accion: 'IMPRIMIR',
    etiqueta: 'Marcar como impreso',
    desde: 'EN_IMPRESION',
    hacia: 'IMPRESO',
    flujos: AMBOS,
    rol: 'KARDEX',
    sede: 'ANCOCAGUA',
    impideBloqueo: true,
  },
  {
    // DEC-053 (D-48): Kardex contrasta las notas del historial con los empastes; si hay observación, no imprime y
    // devuelve. El trámite termina en SISET: el que sigue es otro trámite, fuera del sistema. No lo impide el bloqueo.
    // D-48b (DEC-056): el contraste es solo del historial, no de su legalización.
    accion: 'DEVOLVER',
    etiqueta: 'Devolver con observación',
    desde: 'EN_IMPRESION',
    hacia: 'DEVUELTO',
    flujos: ['CON_VALORADO'],
    soloTipos: ['HISTORIAL_ACADEMICO'],
    rol: 'KARDEX',
    sede: 'ANCOCAGUA',
    impideBloqueo: false,
  },
  {
    accion: 'FIRMA_DIR_ACADEMICA',
    etiqueta: 'Registrar firma de Dirección Académica',
    desde: 'IMPRESO',
    hacia: 'FIRMADO_DIR_ACADEMICA',
    flujos: ['CON_VALORADO'],
    rol: 'SEC_DIR',
    sede: 'LA_PAZ',
    impideBloqueo: false,
  },
  {
    accion: 'FIRMA_DIR_GENERAL',
    etiqueta: 'Registrar firma de Dirección General',
    desde: 'FIRMADO_DIR_ACADEMICA',
    hacia: 'LISTO',
    flujos: ['CON_VALORADO'],
    rol: 'SEC_DIR',
    sede: 'LA_PAZ',
    impideBloqueo: false,
  },
  {
    accion: 'FIRMA_COORDINADOR',
    etiqueta: 'Firmar',
    desde: 'IMPRESO',
    hacia: 'FIRMADO_COORDINADOR',
    flujos: ['SIN_VALORADO'],
    rol: 'COORDINADOR',
    sede: 'ANCOCAGUA',
    impideBloqueo: false,
  },
  {
    accion: 'REMITIR',
    etiqueta: 'Remitir a Calahumana',
    desde: 'FIRMADO_COORDINADOR',
    hacia: 'REMITIDO_CALAHUMANA',
    flujos: ['SIN_VALORADO'],
    rol: 'KARDEX',
    sede: 'ANCOCAGUA',
    impideBloqueo: false,
  },
  {
    accion: 'RECIBIR_CALAHUMANA',
    etiqueta: 'Confirmar que llegó a Calahumana',
    desde: 'REMITIDO_CALAHUMANA',
    hacia: 'LISTO',
    flujos: ['SIN_VALORADO'],
    rol: 'SEC_DIR',
    sede: 'LA_PAZ',
    impideBloqueo: false,
  },
  {
    accion: 'ENTREGAR',
    etiqueta: 'Registrar entrega',
    desde: 'LISTO',
    hacia: 'ENTREGADO',
    flujos: AMBOS,
    rol: 'SEC_DIR',
    sede: 'LA_PAZ',
    impideBloqueo: false,
  },
];

/** La ingesta (S3.4): la registra SEC_DIR en Calahumana (D-05; D-32 pregunta por los certificados). Deja RECIBIDO. */
export const INGESTA = { rol: 'SEC_DIR', sede: 'LA_PAZ', hacia: 'RECIBIDO' } as const satisfies {
  rol: RolHojaRuta;
  sede: CodigoSede;
  hacia: EstadoHojaRuta;
};

/** Estados finales: el trámite ya no se mueve (ENTREGADO, o DEVUELTO por una observación de Kardex, DEC-053). */
export const ESTADOS_FINALES: readonly EstadoHojaRuta[] = ['ENTREGADO', 'DEVUELTO'];

/** Pasos que piden una observación escrita (DEC-053: por qué se devuelve). */
export const PIDEN_OBSERVACION: readonly AccionHojaRuta[] = ['DEVOLVER'];

export const flujoDe = (requiereValorado: boolean): Flujo => (requiereValorado ? 'CON_VALORADO' : 'SIN_VALORADO');

/** Los pasos del flujo en orden, desde RECIBIDO hasta ENTREGADO (para la carátula, P-32). */
export const pasosDelFlujo = (flujo: Flujo): Transicion[] => {
  const pasos: Transicion[] = [];
  let estado: EstadoHojaRuta = INGESTA.hacia;
  for (;;) {
    // El camino normal: la devolución (DEC-053) no es un paso del flujo.
    const t = TRANSICIONES.find((x) => x.desde === estado && x.flujos.includes(flujo) && x.hacia !== 'DEVUELTO');
    if (!t) return pasos;
    pasos.push(t);
    estado = t.hacia;
  }
};

export interface EstadoParaTransicion {
  estado: EstadoHojaRuta;
  flujo: Flujo;
  /** Código del tipo de trámite (HISTORIAL_ACADEMICO…): algunos pasos son de un solo tipo (D-48b). */
  tipo: string;
  fileBloqueado: boolean;
}

/** El paso existe para el estado, el flujo y el tipo del trámite. */
const aplica = (t: Transicion, h: EstadoParaTransicion): boolean =>
  t.desde === h.estado && t.flujos.includes(h.flujo) && (!t.soloTipos || t.soloTipos.includes(h.tipo));

export interface UsuarioParaTransicion {
  rol: string;
  /** null para quien no tiene sede (no debería pasar en el personal, D-24). */
  sede: CodigoSede | null;
}

export type ResultadoTransicion =
  | { ok: true; transicion: Transicion }
  | { ok: false; error: 'TRANSICION_INVALIDA' | 'PROHIBIDO' | 'FILE_BLOQUEADO'; mensaje: string };

/**
 * ¿Puede este usuario hacer esta acción ahora? El orden importa: primero si el paso existe para el estado y el
 * flujo (409), después quién y desde dónde (403), y al final el bloqueo del file (422).
 */
export function evaluarTransicion(
  h: EstadoParaTransicion,
  u: UsuarioParaTransicion,
  accion: AccionHojaRuta,
): ResultadoTransicion {
  const t = TRANSICIONES.find((x) => x.accion === accion && aplica(x, h));
  if (!t)
    return { ok: false, error: 'TRANSICION_INVALIDA', mensaje: 'El trámite no admite ese paso en su estado actual.' };
  if (t.rol !== u.rol || t.sede !== u.sede) {
    return { ok: false, error: 'PROHIBIDO', mensaje: 'Ese paso lo registra otro rol o se registra desde otra sede.' };
  }
  if (t.impideBloqueo && h.fileBloqueado) {
    return {
      ok: false,
      error: 'FILE_BLOQUEADO',
      mensaje: 'El file del titular está bloqueado: no se puede avanzar hasta que se desbloquee.',
    };
  }
  return { ok: true, transicion: t };
}

export interface AccionPosible {
  accion: AccionHojaRuta;
  etiqueta: string;
  /** Por qué no se puede ahora (file bloqueado), o null. */
  deshabilitada: string | null;
}

/** Los pasos que este usuario ve ahora sobre el trámite: los de su rol y su sede (para los botones del detalle). */
export const accionesPosibles = (h: EstadoParaTransicion, u: UsuarioParaTransicion): AccionPosible[] =>
  TRANSICIONES.filter((t) => aplica(t, h) && t.rol === u.rol && t.sede === u.sede).map((t) => ({
    accion: t.accion,
    etiqueta: t.etiqueta,
    deshabilitada: t.impideBloqueo && h.fileBloqueado ? 'El file del titular está bloqueado.' : null,
  }));
