import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

/** Catálogo activo de requisitos (DEC-016): por año de formación (los sin año al final) y código (SDD S2.4 §2.1). */
export async function obtenerRequisitosActivos(cliente: ClienteBd | TransaccionBd) {
  return cliente.requisitoTipo.findMany({
    where: { activo: true },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      descripcion: true,
      anioFormacion: true,
      nivel: true,
      obligatorio: true,
    },
    orderBy: [{ anioFormacion: { sort: 'asc', nulls: 'last' } }, { codigo: 'asc' }],
  });
}

export type RequisitoCatalogo = Awaited<ReturnType<typeof obtenerRequisitosActivos>>[number];
