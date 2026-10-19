import type { ClienteBd, Prisma, TransaccionBd } from '@/compartido/bd';

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

// API de usuarios (SDD S1.8). Nunca seleccionan `passwordHash`.

const SELECCION_DETALLE = {
  id: true,
  username: true,
  personaId: true,
  sedeId: true,
  activo: true,
  intentosFallidos: true,
  bloqueadoHasta: true,
  debeCambiarPassword: true,
  ultimoAcceso: true,
  rol: { select: { codigo: true } },
} as const;

export const buscarUsuarioDetalle = (cliente: Cliente, id: number) =>
  cliente.usuario.findUnique({ where: { id }, select: SELECCION_DETALLE });

export type UsuarioDetalleBd = NonNullable<Awaited<ReturnType<typeof buscarUsuarioDetalle>>>;

/** Todos los que cumplen el filtro: el orden por apellido lo pone el servicio con los datos de personas. */
export const listarUsuarios = (cliente: Cliente, where: Prisma.UsuarioWhereInput) =>
  cliente.usuario.findMany({ where, select: SELECCION_DETALLE });

export const tieneUsuario = async (cliente: Cliente, personaId: number): Promise<boolean> =>
  (await cliente.usuario.findUnique({ where: { personaId }, select: { id: true } })) !== null;

export const buscarRolId = async (cliente: Cliente, codigo: string): Promise<number> =>
  (await cliente.rol.findUniqueOrThrow({ where: { codigo }, select: { id: true } })).id;

export interface NuevoUsuario {
  personaId: number;
  rolId: number;
  sedeId: number;
  username: string;
  passwordHash: string;
}

/** Siempre con `debeCambiarPassword`: la contraseña es una temporal (SDD S1.8 §2.3). */
export const crearUsuario = (cliente: Cliente, datos: NuevoUsuario) =>
  cliente.usuario.create({ data: { ...datos, debeCambiarPassword: true }, select: { id: true } });

export type CambiosUsuario = Partial<
  Pick<
    Prisma.UsuarioUncheckedUpdateInput,
    'rolId' | 'sedeId' | 'activo' | 'passwordHash' | 'debeCambiarPassword' | 'bloqueadoHasta' | 'intentosFallidos'
  >
>;

export const actualizarUsuario = (cliente: Cliente, id: number, cambios: CambiosUsuario) =>
  cliente.usuario.update({ where: { id }, data: cambios, select: { id: true } });

/** ADMIN activos sin contar a `exceptoId`: si da 0, la operación dejaría al sistema sin administrador (DEC-054). */
export const contarOtrosAdminActivos = (cliente: Cliente, exceptoId: number) =>
  cliente.usuario.count({ where: { activo: true, rol: { codigo: 'ADMIN' }, id: { not: exceptoId } } });

/**
 * Serializa en la transacción las operaciones que pueden quitar un ADMIN activo: así dos administradores
 * no se dan de baja mutuamente a la vez (SDD S1.8 §6). Se libera solo al terminar la transacción.
 */
export const bloquearCambiosDeAdmin = (tx: TransaccionBd) => tx.$executeRaw`SELECT pg_advisory_xact_lock(180001)`;
