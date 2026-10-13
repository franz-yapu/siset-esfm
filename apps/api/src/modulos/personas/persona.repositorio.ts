import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

/** "Nombres ApellidoPaterno ApellidoMaterno", sin los apellidos que falten (SDD S1.3 §2.5). */
export async function buscarNombreCompleto(cliente: ClienteBd | TransaccionBd, personaId: number): Promise<string> {
  const p = await cliente.persona.findUniqueOrThrow({
    where: { id: personaId },
    select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true },
  });
  return [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
}
