import type { AccionAuditoria, ModuloAuditoria } from '@/config/auditoria';

/** Autor de un evento, tal como lo devuelve GET /auditoria (SDD S6.4 §2.2). */
export interface UsuarioBitacora {
  id: number;
  usuario: string;
  nombre: string;
}

/** Un evento de la bitácora: contrato de la API, también en modo mock (SDD S6.5 §2.1). */
export interface RegistroAuditoria {
  id: number;
  /** ISO con zona (UTC desde la API). */
  fecha: string;
  usuario: UsuarioBitacora | null;
  /** Código de `AccionAuditoria`; string para tolerar códigos que la web todavía no conoce. */
  accion: string;
  /** Código de `ModuloAuditoria`. */
  modulo: string;
  entidad: string | null;
  entidadId: string | null;
  antes: unknown;
  despues: unknown;
  ip: string | null;
  userAgent: string | null;
}

/** Filtros de GET /auditoria. Las fechas son AAAA-MM-DD en hora de La Paz, inclusivas. */
export interface FiltrosAuditoria {
  usuarioId?: number;
  modulo?: ModuloAuditoria;
  accion?: AccionAuditoria;
  desde?: string;
  hasta?: string;
  entidad?: string;
  entidadId?: string;
}
