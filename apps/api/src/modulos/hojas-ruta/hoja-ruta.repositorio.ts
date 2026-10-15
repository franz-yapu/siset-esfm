import type { ClienteBd, Prisma, TransaccionBd } from '@/compartido/bd';
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

/** Siguiente N.º de la gestión, dentro de la transacción de la ingesta (ADR-0006). */
export async function siguienteNroHojaRuta(tx: TransaccionBd, gestion: number): Promise<string> {
  const [{ nro }] = await tx.$queryRaw<
    { nro: string }[]
  >`SELECT fn_siguiente_nro_hoja_ruta(${gestion}::smallint) AS nro`;
  return nro;
}

export interface NuevaHojaRuta {
  nroTramite: string;
  gestion: number;
  fileId: number;
  tipoTramiteId: number;
  sedeActualId: number;
  nroValorado: string | null;
}

export const insertarHojaRuta = (tx: TransaccionBd, h: NuevaHojaRuta) =>
  tx.hojaRuta.create({ data: h, select: { id: true } });

/** Una página de hojas de ruta, más recientes primero (SDD S3.2-S3.4 §2.3). */
export async function listarHojasRuta(cliente: Cliente, where: Prisma.HojaRutaWhereInput, skip: number, take: number) {
  const [filas, total] = await Promise.all([
    cliente.hojaRuta.findMany({
      where,
      select: SELECCION,
      orderBy: [{ fechaIngreso: 'desc' }, { id: 'desc' }],
      skip,
      take,
    }),
    cliente.hojaRuta.count({ where }),
  ]);
  return { filas, total };
}

/** Hojas y movimientos para el reporte (RF-13): pocas columnas; el piloto tiene cientos de trámites, no millones. */
export async function datosReporte(cliente: Cliente, where: Prisma.HojaRutaWhereInput) {
  const hojas = await cliente.hojaRuta.findMany({ where, select: SELECCION });
  const movimientos = await cliente.movimientoHojaRuta.findMany({
    where: { hojaRutaId: { in: hojas.map((h) => h.id) } },
    select: { hojaRutaId: true, estadoAnterior: true, estadoNuevo: true, fecha: true },
    orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
  });
  return { hojas, movimientos };
}
