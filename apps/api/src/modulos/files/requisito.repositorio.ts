import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

type Cliente = ClienteBd | TransaccionBd;

const SELECCION = {
  requisitoTipoId: true,
  gestion: true,
  estado: true,
  fecha: true,
  nroDocumento: true,
  observacion: true,
  nombreCurso: true,
  entidadEmisora: true,
  registradoPor: true,
  updatedAt: true,
} as const;

/** Lo registrado de cada requisito en el file (SDD S2.4). Lo que no tiene fila está PENDIENTE. */
export const listarRequisitosDelFile = (cliente: Cliente, fileId: number) =>
  cliente.requisitoFile.findMany({ where: { fileId }, select: SELECCION, orderBy: { gestion: 'asc' } });

/** Estado de cada requisito registrado en varios files, en una consulta (semáforo del listado, SDD S2.5 §2.2). */
export const listarEstadosDeFiles = (cliente: Cliente, fileIds: number[]) =>
  fileIds.length === 0
    ? Promise.resolve([])
    : cliente.requisitoFile.findMany({
        where: { fileId: { in: fileIds } },
        select: { fileId: true, requisitoTipoId: true, gestion: true, estado: true },
      });

export type RequisitoFileBd = Awaited<ReturnType<typeof listarRequisitosDelFile>>[number];

export interface DatosRequisitoFile {
  estado: 'PENDIENTE' | 'COMPLETO' | 'OBSERVADO';
  fecha: Date | null;
  nroDocumento: string | null;
  observacion: string | null;
  nombreCurso: string | null;
  entidadEmisora: string | null;
  registradoPor: number | null;
}

/** Una fila por file, requisito y gestión (UNIQUE; la gestión es '' si el requisito no es por gestión). */
export const guardarRequisitoDelFile = (
  cliente: Cliente,
  fileId: number,
  requisitoTipoId: number,
  gestion: string,
  datos: DatosRequisitoFile,
) =>
  cliente.requisitoFile.upsert({
    where: { fileId_requisitoTipoId_gestion: { fileId, requisitoTipoId, gestion } },
    create: { fileId, requisitoTipoId, gestion, ...datos },
    update: datos,
    select: SELECCION,
  });
