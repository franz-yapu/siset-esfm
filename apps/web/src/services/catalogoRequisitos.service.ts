import type { Usuario } from '@/types';
import type {
  CambiosRequisitoCatalogo,
  DatosCrearRequisitoCatalogo,
  RequisitoAdmin,
} from '@/types/catalogo-requisitos';
import { usaApi } from './_modo';
import { catalogoRequisitosApi } from './catalogoRequisitos.api';
import { catalogoRequisitosMock } from './catalogoRequisitos.mock';

/**
 * Contrato de /catalogos/requisitos para Kardex (DEC-055): agregar, editar las modalidades y dar de baja. `actor` lo
 * usa solo el mock (bitácora de la demo). Va con `files`, como los requisitos del file.
 */
export interface ServicioCatalogoRequisitos {
  listar(): Promise<RequisitoAdmin[]>;
  crear(d: DatosCrearRequisitoCatalogo, actor: Usuario): Promise<RequisitoAdmin>;
  editar(id: number, c: CambiosRequisitoCatalogo, actor: Usuario): Promise<RequisitoAdmin>;
  darDeBaja(id: number, actor: Usuario): Promise<RequisitoAdmin>;
  reactivar(id: number, actor: Usuario): Promise<RequisitoAdmin>;
}

export const catalogoRequisitosService: ServicioCatalogoRequisitos = usaApi('files')
  ? catalogoRequisitosApi
  : catalogoRequisitosMock;
