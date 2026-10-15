// Contrato de /api/v1/hojas-ruta (SDD S3.1-S3.3 §2.4, S3.2-S3.4, S3.8-S3.9). Lo usan P-30, P-31 y P-32; el resto
// de las pantallas sigue con el modelo del prototipo hasta su ticket (DEC-037).

export const ESTADOS_HOJA_RUTA = [
  'RECIBIDO',
  'AVISADO_KARDEX',
  'EN_IMPRESION',
  'IMPRESO',
  'FIRMADO_DIR_ACADEMICA',
  'FIRMADO_COORDINADOR',
  'REMITIDO_CALAHUMANA',
  'LISTO',
  'ENTREGADO',
] as const;
export type EstadoHojaRuta = (typeof ESTADOS_HOJA_RUTA)[number];

export type AccionHojaRuta =
  | 'AVISAR_KARDEX'
  | 'RECOGER'
  | 'IMPRIMIR'
  | 'FIRMA_DIR_ACADEMICA'
  | 'FIRMA_DIR_GENERAL'
  | 'FIRMA_COORDINADOR'
  | 'REMITIR'
  | 'RECIBIR_CALAHUMANA'
  | 'ENTREGAR';

export interface TipoTramiteCatalogo {
  codigo: string;
  nombre: string;
  requiereValorado: boolean;
}

export interface FilaHojaRuta {
  nro: string;
  gestion: number;
  tipo: { codigo: string; nombre: string };
  estado: EstadoHojaRuta;
  /** Código de la sede: LA_PAZ | ANCOCAGUA. */
  sedeActual: string;
  titular: { fileId: number; nombre: string; ci: string };
  nroValorado: string | null;
  fechaIngreso: string;
  fechaCierre: string | null;
}

export interface MovimientoHojaRuta {
  accion: string;
  estadoAnterior: EstadoHojaRuta | null;
  estadoNuevo: EstadoHojaRuta;
  sede: string;
  usuario: { id: number; nombre: string };
  observacion: string | null;
  fecha: string;
}

export interface AccionPosible {
  accion: AccionHojaRuta;
  etiqueta: string;
  /** Por qué no se puede ahora (file bloqueado), o null. */
  deshabilitada: string | null;
}

export interface DetalleHojaRuta {
  nro: string;
  gestion: number;
  tipo: TipoTramiteCatalogo;
  estado: EstadoHojaRuta;
  sedeActual: { codigo: string; nombre: string };
  nroValorado: string | null;
  fechaIngreso: string;
  fechaCierre: string | null;
  titular: { fileId: number; nombre: string; ci: string; bloqueado: boolean };
  movimientos: MovimientoHojaRuta[];
  acciones: AccionPosible[];
}

export interface FiltrosHojasRuta {
  texto?: string;
  estado?: EstadoHojaRuta;
  tipoTramite?: string;
  gestion?: number;
  pagina?: number;
  porPagina?: number;
}

export interface DatosCrearHojaRuta {
  fileId: number;
  tipoTramite: string;
  nroValorado: string | null;
  observacion: string | null;
}

/** POST /seguimiento (RF-09): solo el nombre y los pasos, sin quién los hizo. */
export interface Seguimiento {
  nro: string;
  tipo: string;
  estado: EstadoHojaRuta;
  sedeActual: string;
  fechaIngreso: string;
  fechaCierre: string | null;
  titular: string;
  pasos: { estado: EstadoHojaRuta; sede: string; fecha: string }[];
}

export interface FiltrosReporte {
  /** AAAA-MM-DD, fecha de ingreso. */
  desde?: string;
  hasta?: string;
  tipoTramite?: string;
}

/** GET /reportes/hojas-ruta (RF-13). */
export interface ReporteHojasRuta {
  total: number;
  enCurso: number;
  entregados: number;
  tiempoPromedioDias: number | null;
  porEstado: { estado: EstadoHojaRuta; total: number }[];
  porTipo: { codigo: string; nombre: string; total: number }[];
  porMes: { mes: string; total: number }[];
  porEtapa: { estado: EstadoHojaRuta; dias: number }[];
  detenidos: { nro: string; titular: string; estado: EstadoHojaRuta; sedeActual: string; dias: number }[];
}
