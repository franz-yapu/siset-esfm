import type { HojaRuta, HojaRutaConTitular } from '@/types';
import { db } from '@/mocks/db';
import { nombreCompleto, semaforoFile } from '@/lib/reglas';

/** Latencia simulada de la API (SPEC §1). */
export const LATENCIA = 300;

/** Une una hoja de ruta con los datos de su titular, como haría un JOIN en la API. */
export const conTitular = (h: HojaRuta): HojaRutaConTitular => {
  const f = db.files.find((x) => x.id === h.fileId);
  if (!f) throw new Error(`File ${h.fileId} no existe`);
  return { ...structuredClone(h), titular: nombreCompleto(f), ci: f.ci, especialidad: f.especialidad, semaforo: semaforoFile(f) };
};

/** Fecha del último movimiento (para "días en la etapa" y trámites detenidos). */
export const ultimoMovimiento = (h: HojaRuta): string => h.movimientos.at(-1)?.fecha ?? h.fechaIngreso;
