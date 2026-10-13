import type { HojaRutaConTitular, Usuario } from '@/types';
import { db } from '@/mocks/db';
import { delay } from '@/lib/formato';
import { aplicarTransicion, type Accion } from '@/lib/transiciones';
import { conTitular, LATENCIA } from './_comun';

const SEDE_LP = 1;

export interface Pase extends HojaRutaConTitular {
  vieneDe: number;
  enviadoPor: string;
  fechaEnvio: string;
  obsEnvio?: string;
}

/** El último envío (EN_TRANSITO_*) del trámite, con sus datos. */
const comoPase = (h: HojaRutaConTitular): Pase => {
  const envio = [...h.movimientos].reverse().find((m) => m.estado.startsWith('EN_TRANSITO'));
  return {
    ...h,
    vieneDe: envio?.sedeId ?? h.sedeActualId,
    enviadoPor: envio?.usuario ?? '—',
    fechaEnvio: envio?.fecha ?? h.fechaIngreso,
    obsEnvio: envio?.obs,
  };
};

const estadoEntrante = (sedeId: number) => (sedeId === SEDE_LP ? 'EN_TRANSITO_LP' : 'EN_TRANSITO_ANC');
const estadoSaliente = (sedeId: number) => (sedeId === SEDE_LP ? 'EN_TRANSITO_ANC' : 'EN_TRANSITO_LP');

export const pasesService = {
  /** Bandeja "Por recibir" (RF-10 CA2). */
  async porRecibir(sedeId: number): Promise<Pase[]> {
    await delay(LATENCIA);
    return db.hojasRuta
      .filter((h) => h.estado === estadoEntrante(sedeId))
      .map(conTitular)
      .map(comoPase);
  },

  /** Lo que salió de mi sede y aún no recibieron. */
  async enviados(sedeId: number): Promise<Pase[]> {
    await delay(LATENCIA);
    return db.hojasRuta
      .filter((h) => h.estado === estadoSaliente(sedeId))
      .map(conTitular)
      .map(comoPase);
  },

  /** Pases ya completados que pasaron por mi sede (envíos o recepciones). */
  async historial(sedeId: number) {
    await delay(LATENCIA);
    return db.hojasRuta
      .flatMap((h) => {
        const t = conTitular(h);
        return h.movimientos.flatMap((m, i) => {
          const sig = h.movimientos[i + 1];
          if (!m.estado.startsWith('EN_TRANSITO') || !sig) return [];
          if (m.sedeId !== sedeId && sig.sedeId !== sedeId) return [];
          return [
            {
              nro: h.nro,
              titular: t.titular,
              origen: m.sedeId,
              destino: sig.sedeId,
              envio: m.fecha,
              recepcion: sig.fecha,
              enviadoPor: m.usuario,
              recibidoPor: sig.usuario,
            },
          ];
        });
      })
      .sort((a, b) => b.recepcion.localeCompare(a.recepcion));
  },

  async recibir(nros: string[], u: Usuario): Promise<number> {
    await delay(LATENCIA);
    const accion: Accion = u.sedeId === SEDE_LP ? 'RECIBIR_LP' : 'RECIBIR_ANC';
    nros.forEach((nro) => aplicarTransicion(nro, accion, u));
    return nros.length;
  },
};
