import type { ClienteBd, TransaccionBd } from '@/compartido/bd';
import type { AccionHojaRuta, EstadoHojaRuta } from './maquina';

type Cliente = ClienteBd | TransaccionBd;

const SELECCION = {
  id: true,
  nroTramite: true,
  gestion: true,
  fileId: true,
  tipoTramiteId: true,
  estadoActual: true,
  sedeActualId: true,
  nroValorado: true,
  fechaIngreso: true,
  fechaCierre: true,
} as const;

export const buscarHojaRuta = (cliente: Cliente, nro: string) =>
  cliente.hojaRuta.findUnique({ where: { nroTramite: nro }, select: SELECCION });

export type HojaRutaBd = NonNullable<Awaited<ReturnType<typeof buscarHojaRuta>>>;

/**
 * Bloquea la fila hasta el fin de la transacción (`SELECT … FOR UPDATE`): dos usuarios no mueven el mismo trámite a
 * la vez (business-rules §Hojas de ruta). Devuelve el id, o null si no existe.
 */
export async function bloquearHojaRuta(tx: TransaccionBd, nro: string): Promise<number | null> {
  const filas = await tx.$queryRaw<
    { id: number }[]
  >`SELECT "id" FROM "hoja_ruta" WHERE "nro_tramite" = ${nro} FOR UPDATE`;
  return filas[0]?.id ?? null;
}

export const listarMovimientos = (cliente: Cliente, hojaRutaId: number) =>
  cliente.movimientoHojaRuta.findMany({
    where: { hojaRutaId },
    select: {
      id: true,
      accion: true,
      estadoAnterior: true,
      estadoNuevo: true,
      sedeId: true,
      usuarioId: true,
      observacion: true,
      fecha: true,
    },
    orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
  });

export interface NuevoMovimiento {
  hojaRutaId: number;
  accion: AccionHojaRuta | 'REGISTRAR';
  estadoAnterior: EstadoHojaRuta | null;
  estadoNuevo: EstadoHojaRuta;
  sedeId: number;
  usuarioId: number;
  observacion: string | null;
}

/** El trigger tg_movimiento_actualiza_hoja copia el estado y la sede a la hoja (DEC-006). */
export const insertarMovimiento = (cliente: Cliente, m: NuevoMovimiento) =>
  cliente.movimientoHojaRuta.create({ data: m, select: { id: true } });
