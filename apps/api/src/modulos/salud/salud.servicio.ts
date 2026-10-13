import { ErrorServicioNoDisponible } from '@/compartido/errores';
import type { RepositorioSalud } from './salud.repositorio';
import type { Salud } from './salud.esquemas';

export const crearServicioSalud = (repositorio: RepositorioSalud, version: string) => ({
  async estado(): Promise<Salud> {
    try {
      await repositorio.ping();
    } catch {
      throw new ErrorServicioNoDisponible('La base de datos no responde.', 'BD_NO_DISPONIBLE');
    }
    return { estado: 'ok', bd: 'ok', version };
  },
});

export type ServicioSalud = ReturnType<typeof crearServicioSalud>;
