import type { Genero, Modalidad } from './files';

/** Un requisito del catálogo como lo administra Kardex (DEC-055). `modalidades` vacío = todas. */
export interface RequisitoAdmin {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  anioFormacion: number | null;
  obligatorio: boolean;
  orden: number;
  porGestion: boolean;
  soloAniosTerminados: boolean;
  pideCurso: boolean;
  soloGenero: Genero | null;
  modalidades: Modalidad[];
  activo: boolean;
}

export interface DatosCrearRequisitoCatalogo {
  nombre: string;
  descripcion: string | null;
  anioFormacion: number | null;
  obligatorio: boolean;
  modalidades: Modalidad[];
  soloGenero: Genero | null;
  porGestion: boolean;
  soloAniosTerminados: boolean;
  pideCurso: boolean;
}

/** "Por gestión" y "solo años terminados" no se editan: cambiarían lo ya registrado. */
export type CambiosRequisitoCatalogo = Partial<
  Omit<DatosCrearRequisitoCatalogo, 'porGestion' | 'soloAniosTerminados'> & { orden: number }
>;

/** Una modalidad de ingreso del catálogo (DEC-058). El código no cambia. */
export interface ModalidadIngreso {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}

/** Para la pestaña "Modalidades" de Kardex: cuántos requisitos activos la nombran en su lista. */
export interface ModalidadAdmin extends ModalidadIngreso {
  requisitos: number;
}

export interface DatosCrearModalidad {
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export type CambiosModalidad = Partial<Omit<DatosCrearModalidad, 'codigo'> & { orden: number }>;
