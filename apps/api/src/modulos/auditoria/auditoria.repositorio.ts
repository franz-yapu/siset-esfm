import type { ClienteBd, Prisma, TransaccionBd } from '@/compartido/bd';

export const insertarRegistro = (cliente: ClienteBd | TransaccionBd, datos: Prisma.LogAuditoriaUncheckedCreateInput) =>
  cliente.logAuditoria.create({ data: datos, select: { id: true } });
