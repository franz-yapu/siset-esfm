// Contrato de /api/v1/files y /catalogos/especialidades (SDD S2.2 §2.2, DEC-027). Lo usan P-40, P-41 y P-42;
// el resto de las pantallas sigue con el modelo del prototipo (`FileAcademico`) hasta su ticket (DEC-028).

import type { ColorSemaforo } from './index';

export type CondicionFile = 'ESTUDIANTE' | 'EGRESADO';

export interface Especialidad {
  id: number;
  nombre: string;
}

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
  especialidadId: number;
  especialidad: string;
  anioIngreso: number;
  condicion: CondicionFile;
  bloqueado: boolean;
  motivoBloqueo: string | null;
  /** Calculado por la API (SDD S2.5, DEC-031). */
  semaforo: ColorSemaforo;
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
  codigo: string;
  especialidadId: number;
  anioIngreso: number;
  condicion: CondicionFile;
}

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
