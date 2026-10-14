import type { FileAcademico } from '@/types';

/**
 * File del prototipo con los datos que agrega el contrato de la API (SDD S2.9-S2.10 §2.1). Los files
 * del seed no los tienen: el mock parte `apellidos` en paterno y materno al leer.
 */
export type FileMock = FileAcademico & {
  complemento?: string;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
};
