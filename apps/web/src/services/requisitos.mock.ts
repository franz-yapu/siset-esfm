import type { Usuario } from '@/types';
import type { DatosRequisito, EstadoRequisitoFile, RegistroDeGestion, RequisitoDelFile } from '@/types/requisitos';
import { auditar, copia, db } from '@/mocks/db';
import type { FileMock, RequisitoRegistradoMock } from '@/mocks/fileMock';
import { CATALOGO_REQUISITOS, type RequisitoCatalogo } from '@/config/requisitos';
import { delay } from '@/lib/formato';
import { ErrorApi } from '@/lib/errores';
import { normalizarRequisito, validarRequisito } from '@/lib/requisitos';
import {
  entradaDelSemaforo,
  gestionesEsperadas,
  requisitoAplica,
  requisitoAtrasado,
  resumenDeGestiones,
  type FileParaReglas,
} from '@/lib/requisitos-reglas';
import { LATENCIA } from './_comun';
import type { ServicioRequisitos } from './requisitos.service';

// Mock con el contrato de S2.4 y DEC-051: el catálogo del seed de la API (los 24 del folder personal) y, por file,
// lo registrado. Un file del prototipo arranca con lo que tenía en sus 3 requisitos genéricos.

/** Clave de lo registrado: el código, o `código@gestión` en los por gestión. */
const clave = (codigo: string, gestion: string) => (gestion ? `${codigo}@${gestion}` : codigo);

/** Traduce los 3 requisitos genéricos del prototipo al catálogo, la primera vez que se leen. */
function inicial(f: FileMock): Record<string, RequisitoRegistradoMock> {
  const r: Record<string, RequisitoRegistradoMock> = {};
  const completo = (fecha?: string, nro?: string, quien?: string, curso = false): RequisitoRegistradoMock => ({
    estado: 'COMPLETO',
    fecha: fecha ?? null,
    nroDocumento: nro ?? null,
    observacion: null,
    nombreCurso: curso ? 'Taller del prototipo' : null,
    entidadEmisora: curso ? 'ESFM' : null,
    registradoPor: quien ? { id: 0, nombre: quien } : null,
    actualizado: null,
  });
  const { TACFI, TCLO, CERT_NOTAS } = f.requisitos;
  if (TACFI.estado === 'COMPLETO') {
    r.TACFI_1 = completo(TACFI.fecha, TACFI.nro, TACFI.responsable, true);
    r.TACFI_2 = completo(TACFI.fecha, TACFI.nro, TACFI.responsable, true);
  }
  if (TCLO.estado === 'COMPLETO') {
    r.CERT_TCLOA = completo(TCLO.fecha, TCLO.nro, TCLO.responsable);
    r.TCLO_BASICO = completo(TCLO.fecha, TCLO.nro, TCLO.responsable);
  }
  if (CERT_NOTAS.estado === 'COMPLETO') {
    const gestion = (CERT_NOTAS.fecha ?? '2025').slice(0, 4);
    r[clave('CERT_NOTAS', gestion)] = completo(CERT_NOTAS.fecha, CERT_NOTAS.nro, CERT_NOTAS.responsable);
  }
  return r;
}

const buscar = (id: number): FileMock => {
  const f = db.files.find((x) => x.id === id);
  if (!f) throw new ErrorApi('El file no existe.', 'NO_ENCONTRADO', 404);
  f.requisitosCatalogo ??= inicial(f);
  return f;
};

const paraReglas = (f: FileMock): FileParaReglas => ({
  genero: f.genero ?? null,
  modalidad: f.modalidad ?? null,
  anioFormacion: f.anioFormacion ?? null,
});

function gestionesDe(f: FileMock, codigo: string): RegistroDeGestion[] {
  return Object.entries(f.requisitosCatalogo ?? {})
    .filter(([k]) => k.startsWith(`${codigo}@`))
    .map(([k, r]) => ({
      gestion: k.slice(codigo.length + 1),
      estado: r.estado,
      fecha: r.fecha,
      nroDocumento: r.nroDocumento,
      observacion: r.observacion,
      registradoPor: r.registradoPor,
      actualizado: r.actualizado ?? new Date(0).toISOString(),
    }))
    .sort((a, b) => a.gestion.localeCompare(b.gestion));
}

function armar(item: RequisitoCatalogo, f: FileMock): RequisitoDelFile {
  const gestiones = item.porGestion ? gestionesDe(f, item.codigo) : [];
  const r = item.porGestion ? undefined : f.requisitosCatalogo?.[item.codigo];
  const esperadas = item.porGestion ? gestionesEsperadas(item, paraReglas(f)) : null;
  const estado = item.porGestion ? resumenDeGestiones(gestiones, esperadas!) : (r?.estado ?? 'PENDIENTE');
  const aplica = requisitoAplica(item, paraReglas(f));
  return {
    ...item,
    gestionesEsperadas: esperadas,
    nivel: null,
    aplica,
    atrasado: aplica && item.obligatorio && requisitoAtrasado(item, paraReglas(f), estado),
    estado,
    fecha: r?.fecha ?? null,
    nroDocumento: r?.nroDocumento ?? null,
    observacion: r?.observacion ?? null,
    nombreCurso: r?.nombreCurso ?? null,
    entidadEmisora: r?.entidadEmisora ?? null,
    registradoPor: r?.registradoPor ?? null,
    actualizado: r?.actualizado ?? null,
    gestiones,
  };
}

/** Lo que el semáforo del mock recibe (ADR-0007): los obligatorios que aplican y si alguno está atrasado. */
export const entradaSemaforoMock = (fileId: number) => {
  const f = buscar(fileId);
  const porCodigo = new Map(CATALOGO_REQUISITOS.map((c) => [c.codigo, armar(c, f)]));
  return entradaDelSemaforo(CATALOGO_REQUISITOS, paraReglas(f), (c) => porCodigo.get(c.codigo)!.estado);
};

export const requisitosMock: ServicioRequisitos = {
  async listar(fileId: number): Promise<RequisitoDelFile[]> {
    await delay(LATENCIA);
    const f = buscar(fileId);
    return copia(CATALOGO_REQUISITOS.map((item) => armar(item, f)));
  },

  async mios(actor: Usuario): Promise<RequisitoDelFile[]> {
    return requisitosMock.listar(actor.fileId ?? 0);
  },

  async registrar(fileId: number, codigo: string, datos: DatosRequisito, actor: Usuario): Promise<RequisitoDelFile> {
    await delay(LATENCIA);
    const f = buscar(fileId);
    const item = CATALOGO_REQUISITOS.find((c) => c.codigo === codigo.toUpperCase());
    if (!item) throw new ErrorApi('Ese requisito no existe en el catálogo.', 'NO_ENCONTRADO', 404);
    const d = normalizarRequisito(datos);
    const errores = Object.entries(validarRequisito(d, item)).map(([campo, mensaje]) => ({
      ruta: `body.${campo}`,
      mensaje,
    }));
    if (errores.length) throw new ErrorApi('Los datos enviados no son válidos.', 'VALIDACION', 400, errores);

    const k = clave(item.codigo, d.gestion ?? '');
    const guardado = f.requisitosCatalogo?.[k];
    const actual = {
      estado: guardado?.estado ?? 'PENDIENTE',
      fecha: guardado?.fecha ?? null,
      nroDocumento: guardado?.nroDocumento ?? null,
      observacion: guardado?.observacion ?? null,
      nombreCurso: guardado?.nombreCurso ?? null,
      entidadEmisora: guardado?.entidadEmisora ?? null,
    };
    const antes: Record<string, unknown> = {};
    const despues: Record<string, unknown> = {};
    for (const c of ['estado', 'fecha', 'nroDocumento', 'observacion', 'nombreCurso', 'entidadEmisora'] as const) {
      if (actual[c] !== d[c]) {
        antes[c] = actual[c];
        despues[c] = d[c];
      }
    }
    if (Object.keys(despues).length === 0) return copia(armar(item, f));
    f.requisitosCatalogo![k] = {
      estado: d.estado as EstadoRequisitoFile,
      fecha: d.fecha,
      nroDocumento: d.nroDocumento,
      observacion: d.observacion,
      nombreCurso: d.nombreCurso,
      entidadEmisora: d.entidadEmisora,
      registradoPor: { id: actor.id, nombre: actor.nombre },
      actualizado: new Date().toISOString(),
    };
    const id = item.porGestion ? { requisito: item.codigo, gestion: d.gestion } : { requisito: item.codigo };
    auditar(actor.nombre, 'Files', `Registrar ${item.nombre}`, f.codigo, { ...id, ...antes }, { ...id, ...despues });
    return copia(armar(item, f));
  },
};
