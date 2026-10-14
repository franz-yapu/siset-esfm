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
