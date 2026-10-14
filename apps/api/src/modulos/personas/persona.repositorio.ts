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
  email: true,
  celular: true,
} as const;

export interface DatosPersona {
  ci: string;
  /** '' cuando no tiene. */
  complemento: string;
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  email: string | null;
  celular: string | null;
}

export type Persona = DatosPersona & { id: number };

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
