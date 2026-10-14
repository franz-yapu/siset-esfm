import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

type Cliente = ClienteBd | TransaccionBd;

const SELECCION = {
  requisitoTipoId: true,
  estado: true,
  fecha: true,
  nroDocumento: true,
  observacion: true,
  registradoPor: true,
  updatedAt: true,
} as const;

/** Lo registrado de cada requisito en el file (SDD S2.4). Lo que no tiene fila está PENDIENTE. */
export const listarRequisitosDelFile = (cliente: Cliente, fileId: number) =>
  cliente.requisitoFile.findMany({ where: { fileId }, select: SELECCION });

/** Estado de cada requisito registrado en varios files, en una consulta (semáforo del listado, SDD S2.5 §2.2). */
export const listarEstadosDeFiles = (cliente: Cliente, fileIds: number[]) =>
  fileIds.length === 0
    ? Promise.resolve([])
    : cliente.requisitoFile.findMany({
        where: { fileId: { in: fileIds } },
        select: { fileId: true, requisitoTipoId: true, estado: true },
      });

export type RequisitoFileBd = Awaited<ReturnType<typeof listarRequisitosDelFile>>[number];

export interface DatosRequisitoFile {
  estado: 'PENDIENTE' | 'COMPLETO' | 'OBSERVADO';
  fecha: Date | null;
  nroDocumento: string | null;
  observacion: string | null;
  registradoPor: number | null;
}

/** Una sola fila por file y requisito (UNIQUE): crea o actualiza. */
export const guardarRequisitoDelFile = (
  cliente: Cliente,
  fileId: number,
  requisitoTipoId: number,
  datos: DatosRequisitoFile,
) =>
  cliente.requisitoFile.upsert({
    where: { fileId_requisitoTipoId: { fileId, requisitoTipoId } },
    create: { fileId, requisitoTipoId, ...datos },
    update: datos,
    select: SELECCION,
  });
