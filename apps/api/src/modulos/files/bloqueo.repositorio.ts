import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

type Cliente = ClienteBd | TransaccionBd;

/** Todo menos el PDF: el detalle no lo trae (puede pesar hasta 5 MB). */
const SELECCION_BLOQUEO = {
  id: true,
  causa: true,
  nroResolucion: true,
  fechaResolucion: true,
  glosa: true,
  pdfNombre: true,
  bloqueadoPor: true,
  bloqueadoEn: true,
} as const;

export interface NuevoBloqueo {
  fileId: number;
  causa: 'LICENCIA_OBLIGATORIA' | 'LICENCIA_VOLUNTARIA';
  nroResolucion: string;
  fechaResolucion: Date;
  glosa: string;
  pdf: Uint8Array<ArrayBuffer>;
  pdfNombre: string;
  bloqueadoPor: number | null;
}

export const crearBloqueo = (cliente: Cliente, datos: NuevoBloqueo) =>
  cliente.bloqueoFile.create({ data: datos, select: { id: true } });

/** El bloqueo abierto (sin desbloqueo) del file; `uq_bloqueo_abierto` asegura que hay uno como mucho. */
export const buscarBloqueoAbierto = (cliente: Cliente, fileId: number) =>
  cliente.bloqueoFile.findFirst({ where: { fileId, desbloqueadoEn: null }, select: SELECCION_BLOQUEO });

export type BloqueoBd = NonNullable<Awaited<ReturnType<typeof buscarBloqueoAbierto>>>;

export const buscarPdfBloqueoAbierto = (cliente: Cliente, fileId: number) =>
  cliente.bloqueoFile.findFirst({
    where: { fileId, desbloqueadoEn: null },
    select: { pdf: true, pdfNombre: true },
  });

/** Cierra el bloqueo abierto. Los files bloqueados antes de DEC-049 no tienen fila: no hay nada que cerrar. */
export const cerrarBloqueo = (cliente: Cliente, fileId: number, usuarioId: number | null) =>
  cliente.bloqueoFile.updateMany({
    where: { fileId, desbloqueadoEn: null },
    data: { desbloqueadoEn: new Date(), desbloqueadoPor: usuarioId },
  });
