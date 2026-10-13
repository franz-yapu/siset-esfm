import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

type Cliente = ClienteBd | TransaccionBd;

/** Lo que el login necesita del usuario (SDD S1.3 §2.4). */
export const buscarUsuarioParaLogin = (cliente: Cliente, username: string) =>
  cliente.usuario.findUnique({
    where: { username },
    select: {
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
    },
  });

export const registrarAcceso = (cliente: Cliente, id: number, ahora: Date) =>
  cliente.usuario.update({ where: { id }, data: { ultimoAcceso: ahora }, select: { id: true } });
