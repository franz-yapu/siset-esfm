// Contrato de /files/:id/requisitos (SDD S2.4 §2.1, DEC-030).

export type EstadoRequisitoFile = 'PENDIENTE' | 'COMPLETO' | 'OBSERVADO';
export type NivelRequisito = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';

export interface RequisitoDelFile {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  anioFormacion: number | null;
  nivel: NivelRequisito | null;
  obligatorio: boolean;
  estado: EstadoRequisitoFile;
  /** AAAA-MM-DD */
  fecha: string | null;
  nroDocumento: string | null;
  observacion: string | null;
  registradoPor: { id: number; nombre: string } | null;
  actualizado: string | null;
}

export interface DatosRequisito {
  estado: EstadoRequisitoFile;
  fecha: string | null;
  nroDocumento: string | null;
  observacion: string | null;
}
