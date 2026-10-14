import type { Usuario } from '@/types';
import type { DatosRequisito, EstadoRequisitoFile, NivelRequisito, RequisitoDelFile } from '@/types/requisitos';
import { auditar, copia, db } from '@/mocks/db';
import type { FileMock, RequisitoRegistradoMock } from '@/mocks/fileMock';
import { delay } from '@/lib/formato';
import { ErrorApi } from '@/lib/errores';
import { normalizarRequisito, validarRequisito } from '@/lib/requisitos';
import { LATENCIA } from './_comun';
import type { ServicioRequisitos } from './requisitos.service';

// Mock con el contrato de S2.4: el catálogo provisional del seed de la API (DEC-016) y, por file, lo
// registrado. Un file del prototipo arranca con lo que tenía en sus 3 requisitos genéricos.

interface ItemCatalogo {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  anioFormacion: number | null;
  nivel: NivelRequisito | null;
}

const TALLER = 'Taller artístico; requisito para defender el diseño metodológico.';
const DEFENSA = 'Defensa del taller de lengua originaria.';
export const CATALOGO_MOCK: ItemCatalogo[] = [
  { codigo: 'TACFI_1', nombre: 'TACFI artístico de 1.º año', descripcion: TALLER, anioFormacion: 1, nivel: null },
  { codigo: 'TCLO_BASICO', nombre: 'TCLO nivel básico', descripcion: DEFENSA, anioFormacion: 1, nivel: 'BASICO' },
  { codigo: 'TACFI_2', nombre: 'TACFI artístico de 2.º año', descripcion: TALLER, anioFormacion: 2, nivel: null },
  {
    codigo: 'TCLO_INTERMEDIO',
    nombre: 'TCLO nivel intermedio',
    descripcion: DEFENSA,
    anioFormacion: 2,
    nivel: 'INTERMEDIO',
  },
  { codigo: 'TCLO_AVANZADO', nombre: 'TCLO nivel avanzado', descripcion: DEFENSA, anioFormacion: 3, nivel: 'AVANZADO' },
  { codigo: 'CERT_NOTAS', nombre: 'Certificado de notas', descripcion: null, anioFormacion: null, nivel: null },
];

const NIVELES_TCLO = { Básico: 1, Intermedio: 2, Avanzado: 3 } as const;

/** Traduce los 3 requisitos genéricos del prototipo al catálogo, la primera vez que se leen. */
function inicial(f: FileMock): Record<string, RequisitoRegistradoMock> {
  const r: Record<string, RequisitoRegistradoMock> = {};
  const completo = (fecha?: string, nro?: string, quien?: string): RequisitoRegistradoMock => ({
    estado: 'COMPLETO',
    fecha: fecha ?? null,
    nroDocumento: nro ?? null,
    observacion: null,
    registradoPor: quien ? { id: 0, nombre: quien } : null,
    actualizado: null,
  });
  const { TACFI, TCLO, CERT_NOTAS } = f.requisitos;
  if (TACFI.estado === 'COMPLETO') {
    r.TACFI_1 = completo(TACFI.fecha, TACFI.nro, TACFI.responsable);
    r.TACFI_2 = completo(TACFI.fecha, TACFI.nro, TACFI.responsable);
  }
  if (TCLO.estado === 'COMPLETO') {
    const hasta = TCLO.nivel ? NIVELES_TCLO[TCLO.nivel] : 1;
    (['TCLO_BASICO', 'TCLO_INTERMEDIO', 'TCLO_AVANZADO'] as const)
      .slice(0, hasta)
      .forEach((c) => (r[c] = completo(TCLO.fecha, TCLO.nro, TCLO.responsable)));
  }
  if (CERT_NOTAS.estado === 'COMPLETO')
    r.CERT_NOTAS = completo(CERT_NOTAS.fecha, CERT_NOTAS.nro, CERT_NOTAS.responsable);
  return r;
}

const buscar = (id: number): FileMock => {
  const f = db.files.find((x) => x.id === id);
  if (!f) throw new ErrorApi('El file no existe.', 'NO_ENCONTRADO', 404);
  f.requisitosCatalogo ??= inicial(f);
  return f;
};

/** Estado de cada requisito del catálogo en el file (todos son obligatorios en el mock). Lo usa el semáforo. */
export const estadosDeRequisitos = (fileId: number): RequisitoDelFile['estado'][] => {
  const f = buscar(fileId);
  return CATALOGO_MOCK.map((c) => f.requisitosCatalogo?.[c.codigo]?.estado ?? 'PENDIENTE');
};

const armar = (item: ItemCatalogo, r?: RequisitoRegistradoMock): RequisitoDelFile => ({
  ...item,
  obligatorio: true,
  estado: r?.estado ?? 'PENDIENTE',
  fecha: r?.fecha ?? null,
  nroDocumento: r?.nroDocumento ?? null,
  observacion: r?.observacion ?? null,
  registradoPor: r?.registradoPor ?? null,
  actualizado: r?.actualizado ?? null,
});

export const requisitosMock: ServicioRequisitos = {
  async listar(fileId: number): Promise<RequisitoDelFile[]> {
    await delay(LATENCIA);
    const f = buscar(fileId);
    return copia(CATALOGO_MOCK.map((item) => armar(item, f.requisitosCatalogo?.[item.codigo])));
  },

  async registrar(fileId: number, codigo: string, datos: DatosRequisito, actor: Usuario): Promise<RequisitoDelFile> {
    await delay(LATENCIA);
    const f = buscar(fileId);
    const item = CATALOGO_MOCK.find((c) => c.codigo === codigo.toUpperCase());
    if (!item) throw new ErrorApi('Ese requisito no existe en el catálogo.', 'NO_ENCONTRADO', 404);
    const d = normalizarRequisito(datos);
    const errores = Object.entries(validarRequisito(d)).map(([campo, mensaje]) => ({ ruta: `body.${campo}`, mensaje }));
    if (errores.length) throw new ErrorApi('Los datos enviados no son válidos.', 'VALIDACION', 400, errores);

    const actual = armar(item, f.requisitosCatalogo?.[item.codigo]);
    const antes: Record<string, unknown> = {};
    const despues: Record<string, unknown> = {};
    for (const k of ['estado', 'fecha', 'nroDocumento', 'observacion'] as const) {
      if (actual[k] !== d[k]) {
        antes[k] = actual[k];
        despues[k] = d[k];
      }
    }
    if (Object.keys(despues).length === 0) return actual;
    f.requisitosCatalogo![item.codigo] = {
      ...d,
      estado: d.estado as EstadoRequisitoFile,
      registradoPor: { id: actor.id, nombre: actor.nombre },
      actualizado: new Date().toISOString(),
    };
    auditar(
      actor.nombre,
      'Files',
      `Registrar ${item.nombre}`,
      f.codigo,
      { requisito: item.codigo, ...antes },
      {
        requisito: item.codigo,
        ...despues,
      },
    );
    return copia(armar(item, f.requisitosCatalogo![item.codigo]));
  },
};
