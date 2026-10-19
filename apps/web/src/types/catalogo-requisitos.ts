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
