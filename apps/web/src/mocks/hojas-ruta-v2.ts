import type { AccionHojaRuta, EstadoHojaRuta, TipoTramiteCatalogo } from '@/types/hojas-ruta';
import { flujoDe, TRANSICIONES } from '@/lib/maquina-hojas-ruta';

// Hojas de ruta de la demo con el modelo de la API (SDD S3.8-S3.9 §2.1): 9 estados, 4 tipos, movimientos.

export const TIPOS_TRAMITE_MOCK: TipoTramiteCatalogo[] = [
  { codigo: 'HISTORIAL_ACADEMICO', nombre: 'Historial académico', requiereValorado: true },
  { codigo: 'LEGALIZACION_HISTORIAL', nombre: 'Legalización de historial académico', requiereValorado: true },
  { codigo: 'CERT_NOTAS_ANTERIOR', nombre: 'Certificado de notas de años pasados', requiereValorado: false },
  { codigo: 'CERT_EXCELENCIA_ANTERIOR', nombre: 'Certificado de excelencia de años pasados', requiereValorado: false },
];

export interface MovimientoMock {
  accion: AccionHojaRuta | 'REGISTRAR';
  estadoAnterior: EstadoHojaRuta | null;
  estadoNuevo: EstadoHojaRuta;
  sede: 'LA_PAZ' | 'ANCOCAGUA';
  usuario: string;
  observacion: string | null;
  fecha: string;
}

export interface HojaRutaMock {
  nro: string;
  gestion: number;
  fileId: number;
  tipo: string;
  estado: EstadoHojaRuta;
  sedeActual: 'LA_PAZ' | 'ANCOCAGUA';
  nroValorado: string | null;
  fechaIngreso: string;
  fechaCierre: string | null;
  movimientos: MovimientoMock[];
}

const NOMBRE_ROL = { SEC_DIR: 'Secretaría de Dirección', KARDEX: 'Kardex', COORDINADOR: 'Coordinación' } as const;

/** Files egresados de la demo (mocks/files.ts, ids 9 a 13; Betty (13) está bloqueada) con cuántos pasos lleva cada trámite. */
const PLAN: { fileId: number; tipo: string; pasos: number }[] = [
  { fileId: 11, tipo: 'HISTORIAL_ACADEMICO', pasos: 0 },
  { fileId: 9, tipo: 'CERT_NOTAS_ANTERIOR', pasos: 1 },
  { fileId: 10, tipo: 'HISTORIAL_ACADEMICO', pasos: 2 },
  { fileId: 11, tipo: 'CERT_NOTAS_ANTERIOR', pasos: 4 },
  { fileId: 12, tipo: 'LEGALIZACION_HISTORIAL', pasos: 5 },
  { fileId: 13, tipo: 'CERT_EXCELENCIA_ANTERIOR', pasos: 7 },
  { fileId: 9, tipo: 'HISTORIAL_ACADEMICO', pasos: 6 },
  { fileId: 10, tipo: 'CERT_NOTAS_ANTERIOR', pasos: 3 },
];

export function seedHojasRutaV2(): HojaRutaMock[] {
  const gestion = new Date().getFullYear();
  const dia = 24 * 60 * 60_000;
  return PLAN.map((p, i) => {
    const requiereValorado = TIPOS_TRAMITE_MOCK.find((t) => t.codigo === p.tipo)!.requiereValorado;
    const flujo = flujoDe(requiereValorado);
    const inicio = Date.now() - (PLAN.length - i) * 3 * dia;
    const movimientos: MovimientoMock[] = [
      {
        accion: 'REGISTRAR',
        estadoAnterior: null,
        estadoNuevo: 'RECIBIDO',
        sede: 'LA_PAZ',
        usuario: NOMBRE_ROL.SEC_DIR,
        observacion: null,
        fecha: new Date(inicio).toISOString(),
      },
    ];
    let estado: EstadoHojaRuta = 'RECIBIDO';
    for (let k = 0; k < p.pasos; k++) {
      const t = TRANSICIONES.find((x) => x.desde === estado && x.flujos.includes(flujo));
      if (!t) break;
      movimientos.push({
        accion: t.accion,
        estadoAnterior: estado,
        estadoNuevo: t.hacia,
        sede: t.sede,
        usuario: NOMBRE_ROL[t.rol],
        observacion: null,
        fecha: new Date(inicio + (k + 1) * 0.4 * dia).toISOString(),
      });
      estado = t.hacia;
    }
    const ultimo = movimientos.at(-1)!;
    return {
      nro: `HR-${gestion}-${String(i + 1).padStart(6, '0')}`,
      gestion,
      fileId: p.fileId,
      tipo: p.tipo,
      estado,
      sedeActual: ultimo.sede,
      nroValorado: requiereValorado ? String(4500 + i).padStart(6, '0') : null,
      fechaIngreso: movimientos[0].fecha,
      fechaCierre: estado === 'ENTREGADO' ? ultimo.fecha : null,
      movimientos,
    };
  });
}
