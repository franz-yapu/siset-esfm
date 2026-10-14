import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

type Cliente = ClienteBd | TransaccionBd;

/** Especialidades activas, por nombre: el formulario y el filtro de files (SDD S2.2 §2.1). */
export const obtenerEspecialidades = (cliente: Cliente) =>
  cliente.especialidad.findMany({
    where: { activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' },
  });

/** El nombre de la especialidad si existe y está activa; si no, null. */
export async function nombreEspecialidadActiva(cliente: Cliente, id: number): Promise<string | null> {
  const e = await cliente.especialidad.findFirst({ where: { id, activo: true }, select: { nombre: true } });
  return e?.nombre ?? null;
}

/** Nombres por id, también de las inactivas (un file viejo puede tener una). */
export async function nombresEspecialidades(cliente: Cliente, ids: number[]): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map();
  const filas = await cliente.especialidad.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } });
  return new Map(filas.map((e) => [e.id, e.nombre]));
}
