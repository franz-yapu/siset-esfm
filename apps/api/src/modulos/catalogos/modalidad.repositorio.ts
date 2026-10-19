import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

type Cliente = ClienteBd | TransaccionBd;

const SELECCION = { id: true, codigo: true, nombre: true, descripcion: true, orden: true, activo: true } as const;
const ORDEN = [{ orden: 'asc' as const }, { codigo: 'asc' as const }];

/** Las modalidades que se ofrecen al registrar un file (DEC-058). */
export const obtenerModalidadesActivas = (cliente: Cliente) =>
  cliente.modalidadIngreso.findMany({ where: { activo: true }, select: SELECCION, orderBy: ORDEN });

/** Todo el catálogo, también las dadas de baja (pantalla de Kardex). */
export const obtenerTodasLasModalidades = (cliente: Cliente) =>
  cliente.modalidadIngreso.findMany({ select: SELECCION, orderBy: ORDEN });

export type ModalidadBd = Awaited<ReturnType<typeof obtenerTodasLasModalidades>>[number];

export const buscarModalidad = (cliente: Cliente, id: number) =>
  cliente.modalidadIngreso.findUnique({ where: { id }, select: SELECCION });

export const buscarModalidadPorCodigo = (cliente: Cliente, codigo: string) =>
  cliente.modalidadIngreso.findUnique({ where: { codigo }, select: SELECCION });

/** Si el código es de una modalidad activa (lo usa files al registrar o cambiar la modalidad). */
export async function modalidadActiva(cliente: Cliente, codigo: string): Promise<boolean> {
  return (await cliente.modalidadIngreso.count({ where: { codigo, activo: true } })) > 0;
}

export const ultimoOrdenModalidad = async (cliente: Cliente): Promise<number> =>
  (await cliente.modalidadIngreso.aggregate({ _max: { orden: true } }))._max.orden ?? 0;

export interface DatosModalidadBd {
  nombre: string;
  descripcion: string | null;
  orden: number;
}

export const insertarModalidad = (tx: TransaccionBd, codigo: string, datos: DatosModalidadBd) =>
  tx.modalidadIngreso.create({ data: { codigo, ...datos }, select: { id: true } });

export const actualizarModalidad = (
  tx: TransaccionBd,
  id: number,
  cambios: Partial<DatosModalidadBd> & { activo?: boolean },
) => tx.modalidadIngreso.update({ where: { id }, data: cambios, select: { id: true } });

/** Cuántos requisitos activos nombran la modalidad en su lista (los "todas" no cuentan). */
export const requisitosQueLaNombran = async (cliente: Cliente, codigo: string): Promise<number> =>
  (
    await cliente.requisitoTipo.findMany({
      where: { activo: true, soloModalidad: { not: null } },
      select: { soloModalidad: true },
    })
  ).filter((r) => r.soloModalidad!.split(',').includes(codigo)).length;
