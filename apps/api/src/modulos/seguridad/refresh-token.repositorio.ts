import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

type Cliente = ClienteBd | TransaccionBd;

export interface NuevoRefreshToken {
  usuarioId: number;
  /** Hash de `hashDeToken`; nunca el token en claro. */
  tokenHash: string;
  expiraEn: Date;
  ip: string | null;
  userAgent: string | null;
}

export const crearRefreshToken = (cliente: Cliente, datos: NuevoRefreshToken) =>
  cliente.refreshToken.create({ data: datos, select: { id: true } });

/** Devuelve también los revocados y vencidos: qué hacer con ellos lo decide el servicio (S1.5). */
export const buscarRefreshTokenPorHash = (cliente: Cliente, tokenHash: string) =>
  cliente.refreshToken.findUnique({
    where: { tokenHash },
    select: { id: true, usuarioId: true, expiraEn: true, revocadoEn: true, reemplazadoPorId: true },
  });

/** Un eslabón de la cadena de rotación (SDD S1.15 §2.3). */
export const buscarRefreshTokenPorId = (cliente: Cliente, id: number) =>
  cliente.refreshToken.findUnique({ where: { id }, select: { id: true, revocadoEn: true, reemplazadoPorId: true } });

export type RefreshTokenBd = NonNullable<Awaited<ReturnType<typeof buscarRefreshTokenPorHash>>>;

/** Rotación: los `ids` quedan apuntando al token que los reemplazó (SDD S1.15 §2.2–2.3). */
export const marcarReemplazo = (cliente: Cliente, ids: number[], nuevoId: number) =>
  cliente.refreshToken.updateMany({ where: { id: { in: ids } }, data: { reemplazadoPorId: nuevoId } });

/**
 * Revoca la sesión solo si sigue activa; es atómico. `false` significa que ya
 * estaba revocada: en la rotación, eso es reuso (S1.5).
 */
export async function revocarRefreshToken(cliente: Cliente, id: number, ahora: Date): Promise<boolean> {
  const { count } = await cliente.refreshToken.updateMany({
    where: { id, revocadoEn: null },
    data: { revocadoEn: ahora },
  });
  return count === 1;
}

/** Revoca todas las sesiones activas del usuario y devuelve cuántas revocó. */
export async function revocarRefreshTokensDeUsuario(cliente: Cliente, usuarioId: number, ahora: Date): Promise<number> {
  const { count } = await cliente.refreshToken.updateMany({
    where: { usuarioId, revocadoEn: null },
    data: { revocadoEn: ahora },
  });
  return count;
}
