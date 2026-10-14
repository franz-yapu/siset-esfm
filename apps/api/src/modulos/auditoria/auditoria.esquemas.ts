/** Acciones registrables. Se amplía con un PR, nunca con texto libre (SDD S0.7 §2.10). */
export const ACCIONES_AUDITORIA = [
  'CREAR',
  'EDITAR',
  'DAR_DE_BAJA',
  'REACTIVAR',
  'CAMBIAR_ESTADO',
  'BLOQUEAR',
  'DESBLOQUEAR',
  'LOGIN',
  'LOGIN_FALLIDO',
  'LOGOUT',
  'CAMBIAR_PASSWORD',
  'RESTABLECER_PASSWORD',
  'BLOQUEO_CUENTA',
  'DESBLOQUEAR_CUENTA',
  'REUSO_SESION',
  'EXPORTAR',
  'IMPRIMIR',
] as const;
export type AccionAuditoria = (typeof ACCIONES_AUDITORIA)[number];

export const MODULOS_AUDITORIA = [
  'SEGURIDAD',
  'PERSONAS',
  'CATALOGOS',
  'FILES',
  'HOJAS_RUTA',
  'PASES',
  'DICTAMENES',
  'DOCUMENTOS',
  'REPORTES',
  'AUDITORIA',
] as const;
export type ModuloAuditoria = (typeof MODULOS_AUDITORIA)[number];

export interface EventoAuditoria {
  accion: AccionAuditoria;
  modulo: ModuloAuditoria;
  entidad?: string;
  entidadId?: string | number;
  antes?: unknown;
  despues?: unknown;
  /** Si no viene, se usa el usuario del contexto de la petición (p. ej., LOGIN lo pasa explícito). */
  usuarioId?: number | null;
}

export const REDACTADO = '[REDACTADO]';
const CLAVE_SENSIBLE = /password|token|secret/i;

/**
 * Copia el valor para guardarlo en JSONB: reemplaza las claves sensibles a
 * cualquier profundidad (RNF-01) y serializa las fechas a ISO. Lanza si el valor
 * no es serializable (por ejemplo, un BigInt).
 */
export function redactar(valor: unknown): unknown {
  if (valor === undefined) return undefined;
  return JSON.parse(
    JSON.stringify(valor, (clave, v: unknown) => (clave && CLAVE_SENSIBLE.test(clave) ? REDACTADO : v)),
  ) as unknown;
}
