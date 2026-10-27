import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

const nombreDe = (p: { nombres: string; apellidoPaterno: string | null; apellidoMaterno: string | null }) =>
  [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');

/** "Nombres ApellidoPaterno ApellidoMaterno", sin los apellidos que falten (SDD S1.3 §2.5). */
export async function buscarNombreCompleto(cliente: ClienteBd | TransaccionBd, personaId: number): Promise<string> {
  const p = await cliente.persona.findUniqueOrThrow({
    where: { id: personaId },
    select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true },
  });
  return nombreDe(p);
}

/** Lo mismo, por lote: una consulta por página de la bitácora (SDD S6.4 §2.3). */
export async function buscarNombresCompletos(
  cliente: ClienteBd | TransaccionBd,
  personaIds: number[],
): Promise<Map<number, string>> {
  if (personaIds.length === 0) return new Map();
  const filas = await cliente.persona.findMany({
    where: { id: { in: personaIds } },
    select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true },
  });
  return new Map(filas.map((p) => [p.id, nombreDe(p)]));
}

// Escritura y búsqueda para la API de usuarios (SDD S1.8 §2.4). Seguridad las recibe
// desde la raíz de composición y les pasa su `tx` (ADR-0001, regla 3).

const SELECCION_PERSONA = {
  id: true,
  ci: true,
  complemento: true,
  nombres: true,
  apellidoPaterno: true,
  apellidoMaterno: true,
  fechaNacimiento: true,
  email: true,
  celular: true,
  direccion: true,
} as const;

export interface DatosPersona {
  ci: string;
  /** '' cuando no tiene. */
  complemento: string;
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  /** Opcional al crear: la cuenta del personal no lo pide; el file sí (SDD S2.2). */
  fechaNacimiento?: Date | null;
  email: string | null;
  celular: string | null;
  /** Opcional al crear: la edita el estudiante o Kardex (ADR-0013). */
  direccion?: string | null;
}

export type Persona = DatosPersona & { id: number; fechaNacimiento: Date | null; direccion: string | null };

/** Lo que se puede editar de una persona: todo menos el CI y el complemento (DEC-020 #3). */
export type CambiosPersona = Partial<Omit<DatosPersona, 'ci' | 'complemento'>>;

export const buscarPersonaPorCi = (
  cliente: ClienteBd | TransaccionBd,
  ci: string,
  complemento: string,
): Promise<Persona | null> =>
  cliente.persona.findUnique({ where: { ci_complemento: { ci, complemento } }, select: SELECCION_PERSONA });

export const crearPersona = (cliente: ClienteBd | TransaccionBd, datos: DatosPersona): Promise<Persona> =>
  cliente.persona.create({ data: datos, select: SELECCION_PERSONA });

export const actualizarPersona = (
  cliente: ClienteBd | TransaccionBd,
  id: number,
  cambios: CambiosPersona,
): Promise<Persona> => cliente.persona.update({ where: { id }, data: cambios, select: SELECCION_PERSONA });

/** Datos de varias personas por id (una consulta por página de usuarios). */
export async function obtenerPersonas(
  cliente: ClienteBd | TransaccionBd,
  ids: number[],
): Promise<Map<number, Persona>> {
  if (ids.length === 0) return new Map();
  const filas = await cliente.persona.findMany({ where: { id: { in: ids } }, select: SELECCION_PERSONA });
  return new Map(filas.map((p) => [p.id, p]));
}

/**
 * Ids de las personas cuyo nombre contiene el texto, sin distinguir mayúsculas. Cada
 * palabra tiene que aparecer en los nombres o en algún apellido: "rosa quispe" encuentra
 * a "Rosa Quispe Mamani".
 */
export async function buscarIdsPorNombre(cliente: ClienteBd | TransaccionBd, texto: string): Promise<number[]> {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [];
  const filas = await cliente.persona.findMany({
    where: {
      AND: palabras.map((p) => ({
        OR: [
          { nombres: { contains: p, mode: 'insensitive' as const } },
          { apellidoPaterno: { contains: p, mode: 'insensitive' as const } },
          { apellidoMaterno: { contains: p, mode: 'insensitive' as const } },
        ],
      })),
    },
    select: { id: true },
  });
  return filas.map((f) => f.id);
}

/** Ids de las personas cuyo CI contiene el texto (búsqueda de files, SDD S2.2 §2.2). */
export async function buscarIdsPorCi(cliente: ClienteBd | TransaccionBd, texto: string): Promise<number[]> {
  const filas = await cliente.persona.findMany({ where: { ci: { contains: texto.trim() } }, select: { id: true } });
  return filas.map((f) => f.id);
}

// La foto de la persona (ADR-0013), en su tabla: las listas no la cargan.

export type TipoFoto = 'image/jpeg' | 'image/png' | 'image/webp';

/** Cuándo cambió la foto de cada persona que tiene una (para las fichas y para no mostrar una vieja). */
export async function fechasDeFotos(cliente: ClienteBd | TransaccionBd, ids: number[]): Promise<Map<number, Date>> {
  if (ids.length === 0) return new Map();
  const filas = await cliente.personaFoto.findMany({
    where: { personaId: { in: ids } },
    select: { personaId: true, actualizadoEn: true },
  });
  return new Map(filas.map((f) => [f.personaId, f.actualizadoEn]));
}

export const leerFoto = (cliente: ClienteBd | TransaccionBd, personaId: number) =>
  cliente.personaFoto.findUnique({
    where: { personaId },
    select: { contenido: true, tipo: true, actualizadoEn: true },
  });

/** Crea o reemplaza la foto. Devuelve el tamaño y el tipo de la anterior, para la bitácora. */
export async function guardarFoto(
  tx: TransaccionBd,
  personaId: number,
  contenido: Uint8Array<ArrayBuffer>,
  tipo: TipoFoto,
): Promise<{ tipo: string; bytes: number } | null> {
  const antes = await tx.personaFoto.findUnique({ where: { personaId }, select: { tipo: true, contenido: true } });
  await tx.personaFoto.upsert({
    where: { personaId },
    create: { personaId, contenido, tipo },
    update: { contenido, tipo, actualizadoEn: new Date() },
  });
  return antes ? { tipo: antes.tipo, bytes: antes.contenido.length } : null;
}

/** Borra la foto; devuelve lo que había, o null si no tenía. */
export async function borrarFoto(
  tx: TransaccionBd,
  personaId: number,
): Promise<{ tipo: string; bytes: number } | null> {
  const antes = await tx.personaFoto.findUnique({ where: { personaId }, select: { tipo: true, contenido: true } });
  if (!antes) return null;
  await tx.personaFoto.delete({ where: { personaId } });
  return { tipo: antes.tipo, bytes: antes.contenido.length };
}
