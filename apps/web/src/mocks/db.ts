import type { Dictamen, DocumentoEmitido, HojaRuta, RegistroBitacora } from '@/types';
import type { FileMock } from './fileMock';
import { ahora } from '@/lib/formato';
import { seedUsuarios, type UsuarioMock } from './usuarios';
import { seedFiles } from './files';
import { seedDictamenes, seedDocumentos, seedHojasRuta } from './hojasRuta';
import { ipDe, seedBitacora } from './bitacora';
import { seedHojasRutaV2, type HojaRutaMock } from './hojas-ruta-v2';
import type { RequisitoAdmin } from '@/types/catalogo-requisitos';
import type { Modalidad } from '@/types/files';
import { CATALOGO_REQUISITOS } from '@/config/requisitos';

/** El catálogo editable de la demo (DEC-055), a partir de la copia del seed. */
const seedRequisitos = (): RequisitoAdmin[] =>
  CATALOGO_REQUISITOS.map(({ soloModalidad, ...r }, i) => ({
    ...r,
    id: i + 1,
    modalidades: soloModalidad ? (soloModalidad.split(',') as Modalidad[]) : [],
    activo: true,
  }));

interface Store {
  usuarios: UsuarioMock[];
  files: FileMock[];
  hojasRuta: HojaRuta[];
  /** Hojas de ruta con el modelo de la API (P-30, P-31, P-32; DEC-037). */
  hojasRutaV2: HojaRutaMock[];
  dictamenes: Dictamen[];
  documentos: DocumentoEmitido[];
  bitacora: RegistroBitacora[];
  /** Catálogo de requisitos que Kardex administra (DEC-055). */
  requisitos: RequisitoAdmin[];
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
    hojasRutaV2: seedHojasRutaV2(),
    dictamenes: seedDictamenes(hojasRuta),
    documentos: seedDocumentos(hojasRuta),
    bitacora: seedBitacora(hojasRuta, usuarios),
    requisitos: seedRequisitos(),
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
  usuario: string,
  modulo: string,
  accion: string,
  registro: string,
  antes: Record<string, unknown> | null = null,
  despues: Record<string, unknown> | null = null,
): void => {
  const id = (db.bitacora.at(-1)?.id ?? 0) + 1;
  db.bitacora.push({ id, fecha: ahora(), usuario, ip: ipDe(usuario), modulo, accion, registro, antes, despues });
};

/** Copia profunda para que las pantallas nunca muten el store por accidente. */
export const copia = <T>(x: T): T => structuredClone(x);
