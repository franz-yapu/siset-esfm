import type { ClienteBd, TransaccionBd } from '@/compartido/bd';
import { registrarEvento, type AccionAuditoria } from '@/modulos/auditoria';

// Eventos de acceso (DEC-007, DEC-011, SDD S1.7 §2.4). Solo reciben datos tipados y
// acotados: no hay forma de pasarles una contraseña o un token. Exigen un usuarioId:
// el intento con un CI inexistente tiene su propia función (D-26, S1.3b).

type Cliente = ClienteBd | TransaccionBd;

export type MotivoLoginFallido = 'PASSWORD_INCORRECTA' | 'CUENTA_BLOQUEADA' | 'CUENTA_INACTIVA' | 'CI_INEXISTENTE';

const registrar = (
  cliente: Cliente,
  accion: AccionAuditoria,
  afectadoId: number,
  autorId: number | undefined,
  despues?: Record<string, unknown>,
) =>
  registrarEvento(cliente, {
    accion,
    modulo: 'SEGURIDAD',
    entidad: 'usuario',
    entidadId: afectadoId,
    usuarioId: autorId,
    despues,
  });

export const registrarLogin = (cliente: Cliente, usuarioId: number) =>
  registrar(cliente, 'LOGIN', usuarioId, usuarioId);

/**
 * Intento con un CI que no existe (D-26 respondida, S1.3b): sin usuario, y el CI intentado
 * (ya normalizado por el esquema del login) en entidad_id. Nunca la contraseña.
 */
export const registrarLoginCiInexistente = (cliente: Cliente, ciIntentado: string) =>
  registrarEvento(cliente, {
    accion: 'LOGIN_FALLIDO',
    modulo: 'SEGURIDAD',
    entidad: 'usuario',
    entidadId: ciIntentado,
    // null explícito: si no, registrarEvento tomaría el usuario del contexto.
    usuarioId: null,
    despues: { motivo: 'CI_INEXISTENTE' satisfies MotivoLoginFallido },
  });

export const registrarLoginFallido = (
  cliente: Cliente,
  usuarioId: number,
  motivo: MotivoLoginFallido,
  intentosFallidos: number,
) => registrar(cliente, 'LOGIN_FALLIDO', usuarioId, usuarioId, { motivo, intentosFallidos });

export const registrarBloqueo = (cliente: Cliente, usuarioId: number, bloqueadoHasta: Date) =>
  registrar(cliente, 'BLOQUEO_CUENTA', usuarioId, usuarioId, { bloqueadoHasta });

export const registrarLogout = (cliente: Cliente, usuarioId: number) =>
  registrar(cliente, 'LOGOUT', usuarioId, usuarioId);

export const registrarCambioPassword = (cliente: Cliente, usuarioId: number) =>
  registrar(cliente, 'CAMBIAR_PASSWORD', usuarioId, usuarioId);

/** Alguien usó un refresh ya rotado: se revocaron todas las sesiones del usuario (SDD S1.5 §2.2). */
export const registrarReusoSesion = (cliente: Cliente, usuarioId: number, sesionesRevocadas: number) =>
  registrar(cliente, 'REUSO_SESION', usuarioId, usuarioId, { sesionesRevocadas });

/** Lo hace Kardex: el autor sale del contexto de la petición; el afectado va en entidad_id. */
export const registrarRestablecimientoPassword = (cliente: Cliente, usuarioAfectadoId: number) =>
  registrar(cliente, 'RESTABLECER_PASSWORD', usuarioAfectadoId, undefined);

/** Kardex quita el bloqueo por intentos (SDD S1.8 §2.1): el autor sale del contexto. */
export const registrarDesbloqueo = (
  cliente: Cliente,
  usuarioAfectadoId: number,
  antes: { bloqueadoHasta: Date; intentosFallidos: number },
) =>
  registrarEvento(cliente, {
    accion: 'DESBLOQUEAR_CUENTA',
    modulo: 'SEGURIDAD',
    entidad: 'usuario',
    entidadId: usuarioAfectadoId,
    antes,
    despues: { bloqueadoHasta: null, intentosFallidos: 0 },
  });
