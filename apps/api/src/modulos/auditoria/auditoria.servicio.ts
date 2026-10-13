import type { ClienteBd, Prisma, TransaccionBd } from '@/compartido/bd';
import { obtenerContexto } from '@/compartido/http';
import { insertarRegistro } from './auditoria.repositorio';
import { redactar, type EventoAuditoria } from './auditoria.esquemas';

/**
 * Registra un evento en la bitácora (DEC-007, RF-14). Pasá el `tx` de la
 * operación: si la operación hace rollback, el evento también (D-17). Usuario,
 * IP y user agent salen del contexto de la petición.
 */
export async function registrarEvento(cliente: ClienteBd | TransaccionBd, evento: EventoAuditoria): Promise<void> {
  const contexto = obtenerContexto();
  await insertarRegistro(cliente, {
    usuarioId: evento.usuarioId !== undefined ? evento.usuarioId : (contexto?.usuarioId ?? null),
    accion: evento.accion,
    modulo: evento.modulo,
    entidad: evento.entidad ?? null,
    entidadId: evento.entidadId === undefined ? null : String(evento.entidadId),
    datosAntes: redactar(evento.antes) as Prisma.InputJsonValue | undefined,
    datosDespues: redactar(evento.despues) as Prisma.InputJsonValue | undefined,
    ip: contexto?.ip ?? null,
    userAgent: contexto?.userAgent ?? null,
  });
}
