import type { FileAcademico } from '@/types';

/**
 * File del prototipo con los datos que agrega el contrato de la API (SDD S2.9-S2.10 §2.1). Los files
 * del seed no los tienen: el mock parte `apellidos` en paterno y materno al leer.
 */
export type FileMock = FileAcademico & {
  complemento?: string;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  /** Requisitos con el catálogo de S2.4; se arma de `requisitos` la primera vez que se lee. */
  requisitosCatalogo?: Record<string, RequisitoRegistradoMock>;
};

/** Lo registrado de un requisito del catálogo en un file (SDD S2.4). */
export interface RequisitoRegistradoMock {
  estado: 'PENDIENTE' | 'COMPLETO' | 'OBSERVADO';
  fecha: string | null;
  nroDocumento: string | null;
  observacion: string | null;
  registradoPor: { id: number; nombre: string } | null;
  actualizado: string | null;
}
