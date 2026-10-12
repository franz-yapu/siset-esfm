import type { Dictamen, DocumentoEmitido, FileAcademico, HojaRuta, RegistroBitacora, Usuario } from '@/types';
import { ahora } from '@/lib/formato';
import { seedUsuarios } from './usuarios';
import { seedFiles } from './files';
import { seedDictamenes, seedDocumentos, seedHojasRuta } from './hojasRuta';
import { ipDe, seedBitacora } from './bitacora';

interface Store {
  usuarios: Usuario[];
  files: FileAcademico[];
  hojasRuta: HojaRuta[];
  dictamenes: Dictamen[];
  documentos: DocumentoEmitido[];
  bitacora: RegistroBitacora[];
  /** Intentos fallidos de login por usuario (se pierde al recargar). */
  intentos: Record<string, number>;
}

const crear = (): Store => {
  const usuarios = seedUsuarios();
  const hojasRuta = seedHojasRuta();
  return {
    usuarios,
    files: seedFiles(),
    hojasRuta,
    dictamenes: seedDictamenes(hojasRuta),
    documentos: seedDocumentos(hojasRuta),
    bitacora: seedBitacora(hojasRuta, usuarios),
    intentos: {},
  };
};

/** Store en memoria: al recargar la página vuelve al estado inicial. */
export const db: Store = crear();

/** "Reiniciar datos de demo": vuelve todo al estado inicial sin recargar. */
export const reset = (): void => {
  Object.assign(db, crear());
};

/** Registra una acción en la bitácora (RF-14). Lo llaman todos los servicios que modifican datos. */
export const auditar = (
  usuario: string, modulo: string, accion: string, registro: string,
  antes: Record<string, unknown> | null = null, despues: Record<string, unknown> | null = null,
): void => {
  const id = (db.bitacora.at(-1)?.id ?? 0) + 1;
  db.bitacora.push({ id, fecha: ahora(), usuario, ip: ipDe(usuario), modulo, accion, registro, antes, despues });
};

/** Copia profunda para que las pantallas nunca muten el store por accidente. */
export const copia = <T>(x: T): T => structuredClone(x);
