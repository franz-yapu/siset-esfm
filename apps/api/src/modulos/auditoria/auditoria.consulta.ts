import type { ClienteBd, Prisma } from '@/compartido/bd';
import { desplazamiento, type Pagina } from '@/compartido/http';
import type { FiltrosAuditoria, RegistroAuditoria } from './auditoria.consulta.esquemas';
import { listarEventosDeEntidad, listarRegistros } from './auditoria.repositorio';

/** Quién es cada usuario: lo arma la raíz de composición con seguridad y personas (ADR-0001). */
export type DescribirUsuarios = (ids: number[]) => Promise<Map<number, { usuario: string; nombre: string }>>;

/** Bolivia está siempre en UTC−4 (sin horario de verano). */
const inicioDelDia = (fecha: string) => new Date(`${fecha}T00:00:00-04:00`);
const inicioDelDiaSiguiente = (fecha: string) => new Date(inicioDelDia(fecha).getTime() + 24 * 60 * 60_000);

const whereDe = (f: FiltrosAuditoria): Prisma.LogAuditoriaWhereInput => ({
  usuarioId: f.usuarioId,
  modulo: f.modulo,
  accion: f.accion,
  entidad: f.entidad,
  entidadId: f.entidadId,
  ...(f.desde || f.hasta
    ? {
        fecha: {
          ...(f.desde ? { gte: inicioDelDia(f.desde) } : {}),
          ...(f.hasta ? { lt: inicioDelDiaSiguiente(f.hasta) } : {}),
        },
      }
    : {}),
});

/**
 * Consulta de la bitácora (SDD S6.4 §2.2). Consultar no genera eventos: sería uno por cada
 * página que mira el Administrador, sin valor de auditoría (DEC-017).
 */
export const crearServicioConsultaAuditoria = (bd: ClienteBd, describirUsuarios: DescribirUsuarios) => ({
  async listar(filtros: FiltrosAuditoria): Promise<Pagina<RegistroAuditoria>> {
    const { filas, total } = await listarRegistros(bd, whereDe(filtros), desplazamiento(filtros));
    const ids = [...new Set(filas.map((f) => f.usuarioId).filter((id): id is number => id !== null))];
    const usuarios = await describirUsuarios(ids);
    return {
      datos: filas.map((f) => {
        const u = f.usuarioId === null ? undefined : usuarios.get(f.usuarioId);
        return {
          id: f.id,
          fecha: f.fecha.toISOString(),
          usuario: u && f.usuarioId !== null ? { id: f.usuarioId, ...u } : null,
          accion: f.accion,
          modulo: f.modulo,
          entidad: f.entidad,
          entidadId: f.entidadId,
          antes: f.datosAntes ?? null,
          despues: f.datosDespues ?? null,
          ip: f.ip,
          userAgent: f.userAgent,
        };
      }),
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      total,
    };
  },
});

/** Un evento de la bitácora tal como lo leen otros módulos (solo lectura; la tabla es de auditoria). */
export interface EventoDeEntidad {
  id: number;
  fecha: Date;
  usuarioId: number | null;
  accion: string;
  antes: unknown;
  despues: unknown;
}

/**
 * El historial de un registro para otro módulo, p. ej. las entregas de requisitos de un file (observación #3 del
 * tutor, SDD OBS-T1). Leer no genera eventos (DEC-017).
 */
export async function eventosDeEntidad(
  cliente: ClienteBd,
  entidad: string,
  entidadId: string,
  max = 500,
): Promise<EventoDeEntidad[]> {
  const filas = await listarEventosDeEntidad(cliente, entidad, entidadId, max);
  return filas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    usuarioId: f.usuarioId,
    accion: f.accion,
    antes: f.datosAntes,
    despues: f.datosDespues,
  }));
}
