import type { ClienteBd, TransaccionBd } from '@/compartido/bd';
import { registrarEvento, type AccionAuditoria } from '@/modulos/auditoria';

// Eventos de acceso (DEC-007, DEC-011, SDD S1.7 §2.4). Solo reciben datos tipados y
// acotados: no hay forma de pasarles una contraseña o un token. Exigen un usuarioId:
// el intento con un CI inexistente no se anota (propuesta provisional de D-26).

type Cliente = ClienteBd | TransaccionBd;

export type MotivoLoginFallido = 'PASSWORD_INCORRECTA' | 'CUENTA_BLOQUEADA' | 'CUENTA_INACTIVA';

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

/** Lo hace Kardex: el autor sale del contexto de la petición; el afectado va en entidad_id. */
export const registrarRestablecimientoPassword = (cliente: Cliente, usuarioAfectadoId: number) =>
  registrar(cliente, 'RESTABLECER_PASSWORD', usuarioAfectadoId, undefined);
