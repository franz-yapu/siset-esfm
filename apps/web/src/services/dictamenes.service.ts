import type { Dictamen, HojaRutaConTitular, Usuario } from '@/types';
import { copia, db } from '@/mocks/db';
import { ahora, delay } from '@/lib/formato';
import { aplicarTransicion } from '@/lib/transiciones';
import { conTitular, LATENCIA, ultimoMovimiento } from './_comun';

export const dictamenesService = {
  /** Trámites que Kardex envió a dictamen, más antiguos primero. */
  async pendientes(): Promise<(HojaRutaConTitular & { desde: string })[]> {
    await delay(LATENCIA);
    return db.hojasRuta
      .filter((h) => h.estado === 'EN_REVISION' && h.enviadoDictamen)
      .map((h) => ({ ...conTitular(h), desde: ultimoMovimiento(h) }))
      .sort((a, b) => a.desde.localeCompare(b.desde));
  },

  async emitidos(): Promise<(Dictamen & { titular: string; tipo: string })[]> {
    await delay(LATENCIA);
    return db.dictamenes
      .map((d) => {
        const h = db.hojasRuta.find((x) => x.nro === d.nro);
        return { ...copia(d), titular: h ? conTitular(h).titular : '—', tipo: h?.tipo ?? '—' };
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  async deTramite(nro: string): Promise<Dictamen | null> {
    const d = [...db.dictamenes].reverse().find((x) => x.nro === nro);
    return d ? copia(d) : null;
  },

  /** RF-13 CA1 (D-11): Aprobado u Observado; Observado devuelve el trámite a Kardex. */
  async emitir(nro: string, resultado: Dictamen['resultado'], obs: string, u: Usuario): Promise<void> {
    await delay(LATENCIA);
    aplicarTransicion(nro, 'DICTAMINAR', u, { dictamen: resultado, obs });
    db.dictamenes.push({ nro, resultado, obs: obs.trim() || undefined, fecha: ahora(), coordinador: u.nombre });
  },
};
