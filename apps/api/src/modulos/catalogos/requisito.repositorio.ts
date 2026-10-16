import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

/** Catálogo activo de requisitos (DEC-051): en el orden de la hoja del folder personal. */
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
      orden: true,
      porGestion: true,
      pideCurso: true,
      soloGenero: true,
      soloModalidad: true,
      soloAniosTerminados: true,
    },
    orderBy: [{ orden: 'asc' }, { codigo: 'asc' }],
  });
}

export type RequisitoCatalogo = Awaited<ReturnType<typeof obtenerRequisitosActivos>>[number];
