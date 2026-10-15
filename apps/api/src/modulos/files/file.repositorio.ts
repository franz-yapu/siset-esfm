import type { ClienteBd, Prisma, TransaccionBd } from '@/compartido/bd';

type Cliente = ClienteBd | TransaccionBd;

const SELECCION_FILE = {
  id: true,
  personaId: true,
  codigoEstudiante: true,
  especialidadId: true,
  anioIngreso: true,
  condicion: true,
  bloqueado: true,
  motivoBloqueo: true,
} as const;

export const buscarFile = (cliente: Cliente, id: number) =>
  cliente.fileAcademico.findUnique({ where: { id }, select: SELECCION_FILE });

export type FileBd = NonNullable<Awaited<ReturnType<typeof buscarFile>>>;

export const tieneFile = async (cliente: Cliente, personaId: number): Promise<boolean> =>
  (await cliente.fileAcademico.findUnique({ where: { personaId }, select: { id: true } })) !== null;

/** Todos los que cumplen el filtro: el orden por apellido lo pone el servicio (SDD S2.2 §2.2). */
export const listarFiles = (cliente: Cliente, where: Prisma.FileAcademicoWhereInput) =>
  cliente.fileAcademico.findMany({ where, select: SELECCION_FILE });

export interface NuevoFile {
  personaId: number;
  codigoEstudiante: string;
  especialidadId: number;
  anioIngreso: number;
  condicion: 'ESTUDIANTE' | 'EGRESADO';
}

export const crearFile = (cliente: Cliente, datos: NuevoFile) =>
  cliente.fileAcademico.create({ data: datos, select: { id: true } });

export type CambiosFile = Partial<Omit<NuevoFile, 'personaId'>>;

/** Bloqueo con su motivo, o desbloqueo (motivo nulo): el CHECK ck_file_motivo lo exige así. */
export const cambiarBloqueo = (cliente: Cliente, id: number, motivo: string | null) =>
  cliente.fileAcademico.update({
    where: { id },
    data: { bloqueado: motivo !== null, motivoBloqueo: motivo },
    select: { id: true },
  });

export const actualizarFile = (cliente: Cliente, id: number, cambios: CambiosFile) =>
  cliente.fileAcademico.update({ where: { id }, data: cambios, select: { id: true } });

/** Lo que hojas de ruta necesita del file (SDD S3.1-S3.3 §2.4): bloqueo y persona. La raíz lo combina con personas. */
export const datosBasicosFile = (cliente: Cliente, id: number) =>
  cliente.fileAcademico.findUnique({
    where: { id },
    select: { id: true, personaId: true, bloqueado: true, codigoEstudiante: true },
  });
