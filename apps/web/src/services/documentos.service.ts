import type { DocumentoEmitido, HojaRutaConTitular, TipoDocumento, Usuario } from '@/types';
import { auditar, copia, db } from '@/mocks/db';
import { tipoDocumento } from '@/mocks/hojasRuta';
import { ahora, delay } from '@/lib/formato';
import { aplicarTransicion, ErrorNegocio } from '@/lib/transiciones';
import { conTitular, LATENCIA } from './_comun';

export const NOMBRE_DOCUMENTO: Record<TipoDocumento, string> = {
  HISTORIAL: 'Historial académico',
  TCLO: 'Certificación TCLO',
  TACFI: 'Constancia TACFI',
};

export const documentosService = {
  tipoPara: tipoDocumento,

  /** Por emitir: dictamen aprobado (estado Dictaminado). */
  async porEmitir(): Promise<(HojaRutaConTitular & { fechaDictamen: string })[]> {
    await delay(LATENCIA);
    return db.hojasRuta.filter((h) => h.estado === 'DICTAMINADO').map((h) => ({
      ...conTitular(h),
      fechaDictamen: [...h.movimientos].reverse().find((m) => m.estado === 'DICTAMINADO')?.fecha ?? h.fechaIngreso,
    }));
  },

  async emitidos(): Promise<(DocumentoEmitido & { titular: string })[]> {
    await delay(LATENCIA);
    return db.documentos.map((d) => {
      const h = db.hojasRuta.find((x) => x.nro === d.nro);
      return { ...copia(d), titular: h ? conTitular(h).titular : '—' };
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  /** RF-12: emite (registra N.º de valorado) y pasa el trámite a En impresión. */
  async emitir(nro: string, tipo: TipoDocumento, nroValorado: string, u: Usuario): Promise<void> {
    await delay(LATENCIA);
    if (!nroValorado.trim()) throw new ErrorNegocio('El N.º de valorado es obligatorio');
    if (db.documentos.some((d) => d.nroValorado === nroValorado.trim())) throw new ErrorNegocio('Ese N.º de valorado ya fue usado');
    aplicarTransicion(nro, 'EMITIR', u, { obs: `${NOMBRE_DOCUMENTO[tipo]} · valorado ${nroValorado.trim()}` });
    const id = (db.documentos.at(-1)?.id ?? 0) + 1;
    db.documentos.push({ id, nro, tipo, nroValorado: nroValorado.trim(), usuario: u.nombre, fecha: ahora(), esReimpresion: false });
  },

  /** RF-12 CA3: reimprimir exige motivo. */
  async reimprimir(docId: number, nroValorado: string, motivo: string, u: Usuario): Promise<void> {
    await delay(LATENCIA);
    if (!motivo.trim()) throw new ErrorNegocio('El motivo es obligatorio');
    if (!nroValorado.trim()) throw new ErrorNegocio('El N.º de valorado es obligatorio');
    const doc = db.documentos.find((d) => d.id === docId);
    if (!doc) throw new ErrorNegocio('Documento no encontrado');
    const id = (db.documentos.at(-1)?.id ?? 0) + 1;
    db.documentos.push({ ...doc, id, nroValorado: nroValorado.trim(), usuario: u.nombre, fecha: ahora(), esReimpresion: true, motivo: motivo.trim() });
    auditar(u.nombre, 'Emisión', 'Reimprimir documento', doc.nro, { valorado: doc.nroValorado }, { valorado: nroValorado.trim(), motivo: motivo.trim() });
  },
};
