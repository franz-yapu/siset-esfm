import type { ClienteBd, Prisma, TransaccionBd } from '@/compartido/bd';

export const insertarRegistro = (cliente: ClienteBd | TransaccionBd, datos: Prisma.LogAuditoriaUncheckedCreateInput) =>
  cliente.logAuditoria.create({ data: datos, select: { id: true } });

/** Una página de la bitácora con sus filtros, en orden fecha DESC, id DESC (SDD S6.4 §2.2). */
export async function listarRegistros(
  cliente: ClienteBd,
  where: Prisma.LogAuditoriaWhereInput,
  pagina: { skip: number; take: number },
) {
  const [filas, total] = await Promise.all([
    cliente.logAuditoria.findMany({ where, orderBy: [{ fecha: 'desc' }, { id: 'desc' }], ...pagina }),
    cliente.logAuditoria.count({ where }),
  ]);
  return { filas, total };
}
