import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

type Cliente = ClienteBd | TransaccionBd;

/** Tipos de trámite (D-21, DEC-034) y sedes, para el módulo de hojas de ruta (la raíz pasa las funciones). */
export const obtenerTiposTramite = (cliente: Cliente) =>
  cliente.tipoTramite.findMany({
    select: { id: true, codigo: true, nombre: true, requiereValorado: true, activo: true },
    orderBy: { id: 'asc' },
  });

export const obtenerSedes = (cliente: Cliente) =>
  cliente.sede.findMany({ select: { id: true, codigo: true, nombre: true }, orderBy: { id: 'asc' } });
