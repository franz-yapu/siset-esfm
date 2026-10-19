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

const SELECCION_ADMIN = {
  id: true,
  codigo: true,
  nombre: true,
  descripcion: true,
  anioFormacion: true,
  obligatorio: true,
  orden: true,
  porGestion: true,
  pideCurso: true,
  soloGenero: true,
  soloModalidad: true,
  soloAniosTerminados: true,
  activo: true,
} as const;

/** Todo el catálogo, también los dados de baja (pantalla de Kardex, DEC-055). */
export const obtenerTodosLosRequisitos = (cliente: ClienteBd | TransaccionBd) =>
  cliente.requisitoTipo.findMany({ select: SELECCION_ADMIN, orderBy: [{ orden: 'asc' }, { codigo: 'asc' }] });

export type RequisitoAdminBd = Awaited<ReturnType<typeof obtenerTodosLosRequisitos>>[number];

export const buscarRequisito = (cliente: ClienteBd | TransaccionBd, id: number) =>
  cliente.requisitoTipo.findUnique({ where: { id }, select: SELECCION_ADMIN });

export const codigosQueEmpiezanCon = async (cliente: ClienteBd | TransaccionBd, base: string): Promise<string[]> =>
  (await cliente.requisitoTipo.findMany({ where: { codigo: { startsWith: base } }, select: { codigo: true } })).map(
    (r) => r.codigo,
  );

export const ultimoOrden = async (cliente: ClienteBd | TransaccionBd): Promise<number> =>
  (await cliente.requisitoTipo.aggregate({ _max: { orden: true } }))._max.orden ?? 0;

export interface DatosRequisitoBd {
  nombre: string;
  descripcion: string | null;
  anioFormacion: number | null;
  obligatorio: boolean;
  orden: number;
  porGestion: boolean;
  soloAniosTerminados: boolean;
  pideCurso: boolean;
  soloGenero: 'FEMENINO' | 'MASCULINO' | null;
  soloModalidad: string | null;
}

export const insertarRequisito = (cliente: TransaccionBd, codigo: string, datos: DatosRequisitoBd) =>
  cliente.requisitoTipo.create({ data: { codigo, ...datos }, select: { id: true } });

export const actualizarRequisito = (
  cliente: TransaccionBd,
  id: number,
  cambios: Partial<Omit<DatosRequisitoBd, 'porGestion' | 'soloAniosTerminados'>> & { activo?: boolean },
) => cliente.requisitoTipo.update({ where: { id }, data: cambios, select: { id: true } });
