import type { FileAcademico } from '@/types';

/**
 * File del prototipo con los datos que agrega el contrato de la API (SDD S2.9-S2.10 §2.1). Los files
 * del seed no los tienen: el mock parte `apellidos` en paterno y materno al leer.
 */
export type FileMock = FileAcademico & {
  complemento?: string;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  /** Cabecera del folder personal (DEC-051). */
  genero?: 'FEMENINO' | 'MASCULINO' | null;
  /** Código del catálogo de modalidades (DEC-058). */
  modalidad?: string | null;
  anioFormacion?: number | null;
  /** ADR-0013. */
  direccion?: string | null;
  /**
   * Requisitos con el catálogo de S2.4; se arma de `requisitos` la primera vez que se lee. La clave es el código, o
   * `código@gestión` en los por gestión (DEC-051).
   */
  requisitosCatalogo?: Record<string, RequisitoRegistradoMock>;
};

/** Lo registrado de un requisito del catálogo en un file (SDD S2.4). */
export interface RequisitoRegistradoMock {
  estado: 'PENDIENTE' | 'COMPLETO' | 'OBSERVADO';
  fecha: string | null;
  nroDocumento: string | null;
  observacion: string | null;
  nombreCurso?: string | null;
  entidadEmisora?: string | null;
  registradoPor: { id: number; nombre: string } | null;
  actualizado: string | null;
}
