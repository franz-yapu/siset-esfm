import {
  ACCIONES,
  ENTIDADES,
  MODULOS,
  MOTIVOS_LOGIN_FALLIDO,
  esAccion,
  esModulo,
  type TonoAccion,
} from '@/config/auditoria';
import type { FiltrosAuditoria, RegistroAuditoria } from '@/types/bitacora';

// Funciones puras de P-48 (SDD S6.5 §2.6 y §2.7). Se prueban en presentacion.test.ts.

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const motivo = (r: RegistroAuditoria): string | undefined => {
  const m = esObjeto(r.despues) ? r.despues.motivo : undefined;
  return typeof m === 'string' ? m : undefined;
};

export const etiquetaModulo = (codigo: string): string => (esModulo(codigo) ? MODULOS[codigo] : codigo);

/** Etiqueta de la acción; en LOGIN_FALLIDO agrega el motivo. Un código desconocido se muestra tal cual. */
export function etiquetaAccion(r: RegistroAuditoria): string {
  if (!esAccion(r.accion)) return r.accion;
  const base = ACCIONES[r.accion].etiqueta;
  const m = r.accion === 'LOGIN_FALLIDO' ? motivo(r) : undefined;
  return m ? `${base} · ${MOTIVOS_LOGIN_FALLIDO[m] ?? m}` : base;
}

export const tonoAccion = (codigo: string): TonoAccion => (esAccion(codigo) ? ACCIONES[codigo].tono : 'normal');

/** Intento de ingreso con un CI que no existe (DEC-018 #2): sin usuario y el CI en `entidadId`. */
export const esCiInexistente = (r: RegistroAuditoria): boolean =>
  r.usuario === null && r.accion === 'LOGIN_FALLIDO' && motivo(r) === 'CI_INEXISTENTE';

/** Texto de la columna "Registro afectado". */
export function describirRegistro(r: RegistroAuditoria): string {
  if (!r.entidad) return '—';
  if (esCiInexistente(r)) return `CI intentado: ${r.entidadId ?? '—'}`;
  if (r.entidad === 'usuario' && r.usuario && r.entidadId === String(r.usuario.id)) {
    return `Usuario ${r.usuario.usuario}`;
  }
  return describirEntidad(r.entidad, r.entidadId);
}

/** Entidad + id sin más contexto (chip "Historial de"). */
export function describirEntidad(entidad: string, entidadId: string | null | undefined): string {
  if (entidad === 'usuario') return `Usuario #${entidadId ?? '—'}`;
  const nombre = ENTIDADES[entidad] ?? entidad;
  return entidadId ? `${nombre} ${entidadId}` : nombre;
}

/** JSON con las claves ordenadas: `{a,b}` y `{b,a}` son iguales. */
export function jsonEstable(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) =>
    esObjeto(x)
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((k) => [k, x[k]]),
        )
      : x,
  );
}

export interface Diferencia {
  campo: string;
  antes: unknown;
  despues: unknown;
  /** Si el campo existe de cada lado (un campo ausente se muestra "—"). */
  enAntes: boolean;
  enDespues: boolean;
  cambio: boolean;
}

/**
 * Filas del modal "Antes / Después". `null` si alguno de los dos valores no es
 * un objeto (o falta): entonces el modal muestra el JSON tal cual.
 */
export function diferencias(antes: unknown, despues: unknown): Diferencia[] | null {
  const a = antes ?? {};
  const d = despues ?? {};
  if (!esObjeto(a) || !esObjeto(d)) return null;
  const campos = [...new Set([...Object.keys(a), ...Object.keys(d)])].sort((x, y) => x.localeCompare(y, 'es'));
  return campos.map((campo) => {
    const enAntes = campo in a;
    const enDespues = campo in d;
    return {
      campo,
      antes: a[campo],
      despues: d[campo],
      enAntes,
      enDespues,
      cambio: enAntes !== enDespues || jsonEstable(a[campo]) !== jsonEstable(d[campo]),
    };
  });
}

/** Valor de una celda del modal. */
export function textoValor(v: unknown, presente = true): string {
  if (!presente) return '—';
  if (v === null || v === undefined) return 'vacío';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

const FORMATO_LA_PAZ = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** `dd/MM/yyyy HH:mm:ss` en hora de La Paz, sin importar la zona del navegador (§2.7). */
export function fechaHoraLaPaz(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const p = Object.fromEntries(FORMATO_LA_PAZ.formatToParts(fecha).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
}

// ── Filtros en la URL (§2.3) ──────────────────────────────────────────────

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const fechaValida = (v: string | null): v is string =>
  v !== null && FECHA.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const enteroPositivo = (v: string | null): number | undefined => {
  if (!v || !/^\d+$/.test(v)) return undefined;
  const n = Number(v);
  return n >= 1 && Number.isSafeInteger(n) ? n : undefined;
};

export interface EstadoUrl {
  filtros: FiltrosAuditoria;
  pagina: number;
}

/** Lee filtros y página de la URL; lo que no es válido se ignora. */
export function filtrosDesdeUrl(params: URLSearchParams): EstadoUrl {
  const f: FiltrosAuditoria = {};
  const usuarioId = enteroPositivo(params.get('usuarioId'));
  if (usuarioId) f.usuarioId = usuarioId;
  const modulo = params.get('modulo');
  if (modulo && esModulo(modulo)) f.modulo = modulo;
  const accion = params.get('accion');
  if (accion && esAccion(accion)) f.accion = accion;
  const desde = params.get('desde');
  if (fechaValida(desde)) f.desde = desde;
  const hasta = params.get('hasta');
  if (fechaValida(hasta)) f.hasta = hasta;
  const entidad = params.get('entidad')?.trim();
  if (entidad) {
    f.entidad = entidad;
    const entidadId = params.get('entidadId')?.trim();
    if (entidadId) f.entidadId = entidadId;
  }
  return { filtros: f, pagina: enteroPositivo(params.get('pagina')) ?? 1 };
}

/** Escribe filtros y página en la URL, sin los vacíos ni la página 1. */
export function filtrosAUrl(f: FiltrosAuditoria, pagina = 1): URLSearchParams {
  const p = new URLSearchParams();
  const orden: (keyof FiltrosAuditoria)[] = ['desde', 'hasta', 'usuarioId', 'modulo', 'accion', 'entidad', 'entidadId'];
  for (const k of orden) {
    const v = f[k];
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  if (pagina > 1) p.set('pagina', String(pagina));
  return p;
}
