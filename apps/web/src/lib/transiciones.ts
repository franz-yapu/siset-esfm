import type { EstadoTramite, FileAcademico, HojaRuta, Rol, Usuario } from '@/types';
import { auditar, db } from '@/mocks/db';
import { ESTADOS } from '@/config/estados';
import { ahora } from './formato';
import { fileHabilitado } from './reglas';
import { ErrorNegocio } from './errores';

export type Accion =
  | 'ENVIAR_ANC'
  | 'RECIBIR_ANC'
  | 'TOMAR'
  | 'OBSERVAR'
  | 'SUBSANAR'
  | 'ENVIAR_DICTAMEN'
  | 'DICTAMINAR'
  | 'EMITIR'
  | 'ENVIAR_LP'
  | 'RECIBIR_LP'
  | 'MARCAR_LISTO'
  | 'ENTREGAR';

interface Regla {
  accion: Accion;
  etiqueta: string;
  roles: Rol[];
  /** Estado al que lleva. DICTAMINAR depende del resultado; se resuelve en `aplicarTransicion`. */
  siguiente: EstadoTramite;
  /** Sede donde debe estar el usuario que actúa (RF-10 CA3). */
  sede?: number;
  /** Condición extra; si devuelve texto, la acción aparece desactivada con ese motivo. */
  bloqueo?: (h: HojaRuta, f: FileAcademico) => string | null;
}

const sinBloqueo = (_h: HojaRuta, f: FileAcademico): string | null =>
  fileHabilitado(f) ? null : f.bloqueado ? 'El file está bloqueado' : 'El file tiene requisitos pendientes';

/** Tabla de acciones de SPEC P-31 / PRD §3. Cualquier otra combinación es inválida (409 en la API real). */
export const TRANSICIONES: Record<EstadoTramite, Regla[]> = {
  REGISTRADO: [
    { accion: 'ENVIAR_ANC', etiqueta: 'Enviar a Ancocagua', roles: ['SEC_DIR'], siguiente: 'EN_TRANSITO_ANC', sede: 1 },
  ],
  EN_TRANSITO_ANC: [
    {
      accion: 'RECIBIR_ANC',
      etiqueta: 'Confirmar recepción',
      roles: ['SEC_COORD', 'KARDEX'],
      siguiente: 'RECIBIDO',
      sede: 2,
    },
  ],
  RECIBIDO: [
    { accion: 'TOMAR', etiqueta: 'Tomar para revisión', roles: ['KARDEX'], siguiente: 'EN_REVISION', sede: 2 },
  ],
  EN_REVISION: [
    {
      accion: 'OBSERVAR',
      etiqueta: 'Observar',
      roles: ['KARDEX'],
      siguiente: 'OBSERVADO',
      sede: 2,
      bloqueo: (h) => (h.enviadoDictamen ? 'Ya está en dictamen' : null),
    },
    {
      accion: 'ENVIAR_DICTAMEN',
      etiqueta: 'Enviar a dictamen',
      roles: ['KARDEX'],
      siguiente: 'EN_REVISION',
      sede: 2,
      bloqueo: (h, f) => (h.enviadoDictamen ? 'Ya fue enviado a dictamen' : sinBloqueo(h, f)),
    },
    {
      accion: 'DICTAMINAR',
      etiqueta: 'Dictaminar',
      roles: ['COORDINADOR'],
      siguiente: 'DICTAMINADO',
      sede: 2,
      bloqueo: (h) => (h.enviadoDictamen ? null : 'Kardex aún no lo envió a dictamen'),
    },
  ],
  OBSERVADO: [
    { accion: 'SUBSANAR', etiqueta: 'Marcar como subsanado', roles: ['KARDEX'], siguiente: 'EN_REVISION', sede: 2 },
  ],
  DICTAMINADO: [
    {
      accion: 'EMITIR',
      etiqueta: 'Emitir documento',
      roles: ['KARDEX'],
      siguiente: 'EN_IMPRESION',
      sede: 2,
      bloqueo: sinBloqueo,
    },
  ],
  EN_IMPRESION: [
    { accion: 'ENVIAR_LP', etiqueta: 'Enviar a La Paz', roles: ['KARDEX'], siguiente: 'EN_TRANSITO_LP', sede: 2 },
  ],
  EN_TRANSITO_LP: [
    { accion: 'RECIBIR_LP', etiqueta: 'Confirmar recepción', roles: ['SEC_DIR'], siguiente: 'EN_FIRMA', sede: 1 },
  ],
  EN_FIRMA: [
    { accion: 'MARCAR_LISTO', etiqueta: 'Marcar como listo', roles: ['SEC_DIR'], siguiente: 'LISTO', sede: 1 },
  ],
  LISTO: [{ accion: 'ENTREGAR', etiqueta: 'Registrar entrega', roles: ['SEC_DIR'], siguiente: 'ENTREGADO', sede: 1 }],
  ENTREGADO: [],
};

export interface AccionDisponible {
  accion: Accion;
  etiqueta: string;
  deshabilitada: string | null;
}

/** Acciones que el usuario puede ver ahora sobre el trámite (solo las de su rol y su sede). */
export const accionesDisponibles = (h: HojaRuta, f: FileAcademico, u: Usuario): AccionDisponible[] =>
  TRANSICIONES[h.estado]
    .filter((r) => r.roles.includes(u.rol) && (r.sede === undefined || r.sede === u.sedeId))
    .filter(
      (r) => !(r.accion === 'DICTAMINAR' && !h.enviadoDictamen) && !(r.accion === 'OBSERVAR' && h.enviadoDictamen),
    )
    .filter((r) => !(r.accion === 'ENVIAR_DICTAMEN' && h.enviadoDictamen))
    .map((r) => ({ accion: r.accion, etiqueta: r.etiqueta, deshabilitada: r.bloqueo?.(h, f) ?? null }));

/** Se movió a lib/errores.ts (SDD S0.8 §2.2); se reexporta para no tocar los servicios. */
export { ErrorNegocio } from './errores';

export interface DatosTransicion {
  obs?: string;
  dictamen?: 'APROBADO' | 'OBSERVADO';
}

/**
 * Valida y aplica una acción: cambia el estado, agrega el movimiento al timeline
 * y registra en la bitácora. Lanza ErrorNegocio si no corresponde.
 */
export const aplicarTransicion = (nro: string, accion: Accion, u: Usuario, datos: DatosTransicion = {}): HojaRuta => {
  const h = db.hojasRuta.find((x) => x.nro === nro);
  if (!h) throw new ErrorNegocio(`No existe el trámite ${nro}`);
  const f = db.files.find((x) => x.id === h.fileId);
  if (!f) throw new ErrorNegocio('El trámite no tiene file asociado');

  const regla = TRANSICIONES[h.estado].find((r) => r.accion === accion);
  if (!regla) throw new ErrorNegocio(`No se puede "${accion}" un trámite en estado ${ESTADOS[h.estado].etiqueta}`);
  if (!regla.roles.includes(u.rol)) throw new ErrorNegocio('Tu rol no puede realizar esta acción');
  if (regla.sede !== undefined && regla.sede !== u.sedeId) throw new ErrorNegocio('El trámite no está en tu sede');
  const motivo = regla.bloqueo?.(h, f);
  if (motivo) throw new ErrorNegocio(motivo);
  if ((accion === 'OBSERVAR' || datos.dictamen === 'OBSERVADO') && !datos.obs?.trim()) {
    throw new ErrorNegocio('La observación es obligatoria');
  }

  const antes = { estado: h.estado, enviadoDictamen: Boolean(h.enviadoDictamen) };
  let siguiente = regla.siguiente;
  if (accion === 'DICTAMINAR' && datos.dictamen === 'OBSERVADO') siguiente = 'OBSERVADO';
  if (accion === 'DICTAMINAR' && datos.dictamen === 'APROBADO' && !fileHabilitado(f)) {
    throw new ErrorNegocio('No se puede aprobar: el file está bloqueado o incompleto');
  }

  h.enviadoDictamen = accion === 'ENVIAR_DICTAMEN';
  h.estado = siguiente;
  h.sedeActualId = regla.sede ?? h.sedeActualId;
  const obs =
    datos.obs?.trim() ||
    (accion === 'DICTAMINAR' ? `Dictamen: ${datos.dictamen === 'APROBADO' ? 'Aprobado' : 'Observado'}` : undefined) ||
    (accion === 'ENVIAR_DICTAMEN' ? 'Enviado al Coordinador para dictamen' : undefined);
  h.movimientos.push({ estado: siguiente, fecha: ahora(), sedeId: h.sedeActualId, usuario: u.nombre, obs });

  const esPase = ['ENVIAR_ANC', 'RECIBIR_ANC', 'ENVIAR_LP', 'RECIBIR_LP'].includes(accion);
  auditar(u.nombre, esPase ? 'Pases' : 'Hojas de ruta', regla.etiqueta, nro, antes, {
    estado: h.estado,
    enviadoDictamen: Boolean(h.enviadoDictamen),
    ...(obs ? { observacion: obs } : {}),
  });
  return h;
};
