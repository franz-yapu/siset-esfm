import type { Usuario } from '@/types';
import type {
  CambiosModalidad,
  DatosCrearModalidad,
  ModalidadAdmin,
  ModalidadIngreso,
} from '@/types/catalogo-requisitos';
import { usaApi } from './_modo';
import { catalogoModalidadesApi } from './catalogoModalidades.api';
import { catalogoModalidadesMock } from './catalogoModalidades.mock';

/**
 * Contrato de /catalogos/modalidades (DEC-058): las activas para el formulario del file y la administración de Kardex.
 * `actor` lo usa solo el mock (bitácora de la demo). Va con `files`, como el resto del catálogo de requisitos.
 */
export interface ServicioCatalogoModalidades {
  activas(): Promise<ModalidadIngreso[]>;
  listar(): Promise<ModalidadAdmin[]>;
  crear(d: DatosCrearModalidad, actor: Usuario): Promise<ModalidadAdmin>;
  editar(id: number, c: CambiosModalidad, actor: Usuario): Promise<ModalidadAdmin>;
  darDeBaja(id: number, actor: Usuario): Promise<ModalidadAdmin>;
  reactivar(id: number, actor: Usuario): Promise<ModalidadAdmin>;
}

export const catalogoModalidadesService: ServicioCatalogoModalidades = usaApi('files')
  ? catalogoModalidadesApi
  : catalogoModalidadesMock;
