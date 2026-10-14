// Copia de las listas cerradas de apps/api/src/modulos/auditoria/auditoria.esquemas.ts.
// config/auditoria.test.ts falla si dejan de ser iguales (SDD S6.5 §2.2).

export const ACCIONES_AUDITORIA = [
  'CREAR',
  'EDITAR',
  'DAR_DE_BAJA',
  'REACTIVAR',
  'CAMBIAR_ESTADO',
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

export type TonoAccion = 'normal' | 'aviso' | 'peligro';

export const ACCIONES: Record<AccionAuditoria, { etiqueta: string; tono: TonoAccion }> = {
  CREAR: { etiqueta: 'Creación', tono: 'normal' },
  EDITAR: { etiqueta: 'Edición', tono: 'normal' },
  DAR_DE_BAJA: { etiqueta: 'Baja', tono: 'aviso' },
  REACTIVAR: { etiqueta: 'Reactivación', tono: 'normal' },
  CAMBIAR_ESTADO: { etiqueta: 'Cambio de estado', tono: 'normal' },
  LOGIN: { etiqueta: 'Inicio de sesión', tono: 'normal' },
  LOGIN_FALLIDO: { etiqueta: 'Intento de ingreso fallido', tono: 'aviso' },
  LOGOUT: { etiqueta: 'Cierre de sesión', tono: 'normal' },
  CAMBIAR_PASSWORD: { etiqueta: 'Cambio de contraseña', tono: 'normal' },
  RESTABLECER_PASSWORD: { etiqueta: 'Restablecimiento de contraseña', tono: 'aviso' },
  BLOQUEO_CUENTA: { etiqueta: 'Bloqueo de cuenta', tono: 'peligro' },
  DESBLOQUEAR_CUENTA: { etiqueta: 'Desbloqueo de cuenta', tono: 'normal' },
  REUSO_SESION: { etiqueta: 'Reuso de sesión (posible robo)', tono: 'peligro' },
  EXPORTAR: { etiqueta: 'Exportación', tono: 'normal' },
  IMPRIMIR: { etiqueta: 'Impresión', tono: 'normal' },
};

export const MODULOS: Record<ModuloAuditoria, string> = {
  SEGURIDAD: 'Seguridad',
  PERSONAS: 'Personas',
  CATALOGOS: 'Catálogos',
  FILES: 'Files',
  HOJAS_RUTA: 'Hojas de ruta',
  PASES: 'Pases',
  DICTAMENES: 'Dictámenes',
  DOCUMENTOS: 'Documentos',
  REPORTES: 'Reportes',
  AUDITORIA: 'Auditoría',
};

/** Motivos de LOGIN_FALLIDO (`despues.motivo`, MotivoLoginFallido de la API). */
export const MOTIVOS_LOGIN_FALLIDO: Record<string, string> = {
  PASSWORD_INCORRECTA: 'contraseña incorrecta',
  CUENTA_BLOQUEADA: 'cuenta bloqueada',
  CUENTA_INACTIVA: 'cuenta dada de baja',
  CI_INEXISTENTE: 'CI no registrado',
};

/** Nombre legible de las entidades que registra la API. */
export const ENTIDADES: Record<string, string> = {
  usuario: 'Usuario',
  persona: 'Persona',
  file: 'File',
  hoja_ruta: 'Hoja de ruta',
  documento: 'Documento',
  dictamen: 'Dictamen',
};

export const esAccion = (v: string): v is AccionAuditoria => (ACCIONES_AUDITORIA as readonly string[]).includes(v);
export const esModulo = (v: string): v is ModuloAuditoria => (MODULOS_AUDITORIA as readonly string[]).includes(v);
