import type { RegistroBitacora } from '@/types';
import { copia, db } from '@/mocks/db';
import { delay } from '@/lib/formato';
import { LATENCIA } from './_comun';

export interface FiltrosBitacora { desde?: string; hasta?: string; usuario?: string; modulo?: string; accion?: string }

export const bitacoraService = {
  /** RF-14: solo lectura. No hay funciones para editar ni borrar. */
  async listar(f: FiltrosBitacora = {}): Promise<RegistroBitacora[]> {
    await delay(LATENCIA);
    const a = f.accion?.toLowerCase().trim();
    return copia(db.bitacora.filter((r) =>
      (!f.desde || r.fecha.slice(0, 10) >= f.desde)
      && (!f.hasta || r.fecha.slice(0, 10) <= f.hasta)
      && (!f.usuario || r.usuario === f.usuario)
      && (!f.modulo || r.modulo === f.modulo)
      && (!a || r.accion.toLowerCase().includes(a))).reverse());
  },

  /** Opciones para los filtros. */
  opciones(): { usuarios: string[]; modulos: string[] } {
    return {
      usuarios: [...new Set(db.bitacora.map((r) => r.usuario))].sort(),
      modulos: [...new Set(db.bitacora.map((r) => r.modulo))].sort(),
    };
  },
};
