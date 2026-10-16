// Contrato de /files/:id/requisitos (SDD S2.4 §2.1, DEC-030, DEC-051).

export type EstadoRequisitoFile = 'PENDIENTE' | 'COMPLETO' | 'OBSERVADO';
export type NivelRequisito = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';

/** Una gestión de un requisito por gestión (matrícula, certificado de notas). */
export interface RegistroDeGestion {
  /** "I/2025", "II/2025" o "2023". */
  gestion: string;
  estado: EstadoRequisitoFile;
  fecha: string | null;
  nroDocumento: string | null;
  observacion: string | null;
  registradoPor: { id: number; nombre: string } | null;
  actualizado: string;
}

export interface RequisitoDelFile {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  anioFormacion: number | null;
  nivel: NivelRequisito | null;
  obligatorio: boolean;
  /** N.º en la hoja del folder personal. */
  orden: number;
  porGestion: boolean;
  /** Por gestión: solo cuentan los años ya terminados (certificado de notas, D-47). */
  soloAniosTerminados: boolean;
  /** Por gestión: cuántos años distintos tiene que cubrir (D-47, provisional hasta D-47b); null en los demás. */
  gestionesEsperadas: number | null;
  /** TACFI: pide el nombre del curso y la entidad emisora. */
  pideCurso: boolean;
  soloGenero: 'FEMENINO' | 'MASCULINO' | null;
  soloModalidad: string | null;
  /** Se le pide a este file según su género y modalidad (ADR-0007). */
  aplica: boolean;
  /** De un año que el estudiante ya pasó y sin completar (D-31). */
  atrasado: boolean;
  /** En los por gestión, el resumen de sus gestiones. */
  estado: EstadoRequisitoFile;
  /** AAAA-MM-DD */
  fecha: string | null;
  nroDocumento: string | null;
  observacion: string | null;
  nombreCurso: string | null;
  entidadEmisora: string | null;
  registradoPor: { id: number; nombre: string } | null;
  actualizado: string | null;
  /** Solo en los por gestión. */
  gestiones: RegistroDeGestion[];
}

export interface DatosRequisito {
  estado: EstadoRequisitoFile;
  fecha: string | null;
  nroDocumento: string | null;
  observacion: string | null;
  /** Solo en los por gestión. */
  gestion: string | null;
  /** Solo en los TACFI. */
  nombreCurso: string | null;
  entidadEmisora: string | null;
}
