import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

type Cliente = ClienteBd | TransaccionBd;

const SELECCION_USUARIO = {
  id: true,
  username: true,
  personaId: true,
  sedeId: true,
  passwordHash: true,
  activo: true,
  intentosFallidos: true,
  bloqueadoHasta: true,
  debeCambiarPassword: true,
  ultimoAcceso: true,
  rol: { select: { codigo: true } },
} as const;

/** Lo que el login necesita del usuario (SDD S1.3 §2.4). */
export const buscarUsuarioParaLogin = (cliente: Cliente, username: string) =>
  cliente.usuario.findUnique({ where: { username }, select: SELECCION_USUARIO });

/** Lo mismo, por id: refresh y cambio de contraseña (SDD S1.5). */
export const buscarUsuarioPorId = (cliente: Cliente, id: number) =>
  cliente.usuario.findUnique({ where: { id }, select: SELECCION_USUARIO });

export type UsuarioBd = NonNullable<Awaited<ReturnType<typeof buscarUsuarioPorId>>>;

/** Login correcto: último acceso, y el contador y el bloqueo vuelven a cero (SDD S1.4 §2.1). */
export const registrarAcceso = (cliente: Cliente, id: number, ahora: Date) =>
  cliente.usuario.update({
    where: { id },
    data: { ultimoAcceso: ahora, intentosFallidos: 0, bloqueadoHasta: null },
    select: { id: true },
  });

/** +1 atómico (UPDATE … SET x = x + 1 RETURNING); devuelve el valor nuevo. */
export async function sumarIntentoFallido(cliente: Cliente, id: number): Promise<number> {
  const { intentosFallidos } = await cliente.usuario.update({
    where: { id },
    data: { intentosFallidos: { increment: 1 } },
    select: { intentosFallidos: true },
  });
  return intentosFallidos;
}

/** Bloquea hasta `hasta` y deja el contador en 0: al vencer, hay otros N intentos. */
export const bloquearCuenta = (cliente: Cliente, id: number, hasta: Date) =>
  cliente.usuario.update({ where: { id }, data: { bloqueadoHasta: hasta, intentosFallidos: 0 }, select: { id: true } });

/** Contraseña nueva: ya no hace falta cambiarla (SDD S1.5 §2.3). */
export const actualizarPassword = (cliente: Cliente, id: number, passwordHash: string) =>
  cliente.usuario.update({ where: { id }, data: { passwordHash, debeCambiarPassword: false }, select: { id: true } });

/** CI y persona de varios usuarios, para mostrar quién hizo cada evento (SDD S6.4 §2.3). */
export const describirUsuarios = (cliente: Cliente, ids: number[]) =>
  ids.length === 0
    ? Promise.resolve([])
    : cliente.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, personaId: true } });
