// Contrato de /api/v1/files y /catalogos/especialidades (SDD S2.2 §2.2, DEC-027). Lo usan P-40, P-41 y P-42;
// el resto de las pantallas sigue con el modelo del prototipo (`FileAcademico`) hasta su ticket (DEC-028).

import type { ColorSemaforo } from './index';

export type CondicionFile = 'ESTUDIANTE' | 'EGRESADO';

export interface Especialidad {
  id: number;
  nombre: string;
}

/** Decide si se pide la libreta militar (DEC-051). */
export type Genero = 'FEMENINO' | 'MASCULINO';

/** Código de una modalidad de ingreso (D-45): del catálogo que administra Kardex (DEC-058). A, B1, B2, B3… */
export type Modalidad = string;

/** Las cuatro con las que arranca el catálogo (migración de DEC-058); el resto las agrega Kardex. */
export const MODALIDADES_INICIALES = ['A', 'B1', 'B2', 'B3'] as const;

export interface FileDetalle {
  id: number;
  codigo: string;
  ci: string;
  complemento: string;
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  nombre: string;
  /** AAAA-MM-DD */
  fechaNacimiento: string | null;
  celular: string | null;
  email: string | null;
  direccion: string | null;
  /** Cuándo cambió la foto, o null si no tiene (ADR-0013). La imagen se pide aparte. */
  foto: string | null;
  especialidadId: number;
  especialidad: string;
  anioIngreso: number;
  condicion: CondicionFile;
  genero: Genero | null;
  modalidad: Modalidad | null;
  anioFormacion: number | null;
  bloqueado: boolean;
  motivoBloqueo: string | null;
  /** Calculado por la API (SDD S2.5, DEC-031). `null` en el egresado: no se le piden requisitos (DEC-060). */
  semaforo: ColorSemaforo | null;
}

export interface DatosCrearFile {
  ci: string;
  complemento: string;
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  fechaNacimiento: string | null;
  celular: string | null;
  email: string | null;
  /** La edita también el estudiante (ADR-0013). */
  direccion: string | null;
  codigo: string;
  especialidadId: number;
  anioIngreso: number;
  condicion: CondicionFile;
  /** Cabecera del folder personal (DEC-051). */
  genero: Genero | null;
  modalidad: Modalidad | null;
  anioFormacion: number | null;
}

/** Lo que el estudiante cambia de su file (ADR-0013). */
export type CambiosContacto = Partial<Pick<DatosCrearFile, 'email' | 'celular' | 'direccion'>>;

/** El file de la URL, o 'mio' (el de la sesión, para el estudiante). */
export type FileOMio = number | 'mio';

/** Todo menos el CI y el complemento (no se editan, DEC-027 #1); solo lo que cambió. */
export type CambiosFile = Partial<Omit<DatosCrearFile, 'ci' | 'complemento'>>;

export interface FiltrosFiles {
  texto?: string;
  especialidadId?: number;
  anioIngreso?: number;
  condicion?: CondicionFile;
  bloqueado?: boolean;
  semaforo?: ColorSemaforo;
  pagina?: number;
  porPagina?: number;
}

/** Las dos causas de bloqueo (D-29, DEC-049). */
export type CausaBloqueo = 'LICENCIA_OBLIGATORIA' | 'LICENCIA_VOLUNTARIA';

/** El formulario del bloqueo: la resolución y su PDF (DEC-049). */
export interface DatosBloqueo {
  causa: CausaBloqueo;
  nroResolucion: string;
  /** AAAA-MM-DD */
  fechaResolucion: string;
  glosa: string;
  pdf: File;
}

/** El bloqueo abierto del file, sin el PDF (`GET /files/:id/bloqueo`). */
export interface Bloqueo {
  causa: CausaBloqueo;
  nroResolucion: string;
  fechaResolucion: string;
  glosa: string;
  pdfNombre: string;
  bloqueadoEn: string;
  bloqueadoPor: { id: number; nombre: string } | null;
}

/** Qué pasó con la cuenta del estudiante al registrar o importar su file (DEC-064 #4, #5). */
export type ResultadoCuenta = 'CREADA' | 'EXISTENTE' | 'REACTIVADA' | 'USUARIO_OCUPADO' | 'DESACTIVADA';

/** POST /files: el file y su cuenta (null en el egresado). */
export type FileCreado = FileDetalle & { cuentaEstudiante?: ResultadoCuenta | null };

/** POST /files/importacion (DEC-064 #3): qué hace (o hizo) con cada fila. */
export interface ResultadoImportacion {
  aplicado: boolean;
  resumen: { crear: number; actualizar: number; sinCambios: number; errores: number };
  filas: {
    /** N.º de fila enviada, desde 1. */
    fila: number;
    ci: string | null;
    nombre: string | null;
    accion: 'CREAR' | 'ACTUALIZAR' | 'SIN_CAMBIOS' | 'ERROR';
    cambios: string[];
    errores: { campo: string; mensaje: string }[];
    cuenta: ResultadoCuenta | null;
  }[];
}
