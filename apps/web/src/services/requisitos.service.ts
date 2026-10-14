import type { Usuario } from '@/types';
import type { DatosRequisito, RequisitoDelFile } from '@/types/requisitos';
import { usaApi } from './_modo';
import { requisitosApi } from './requisitos.api';
import { requisitosMock } from './requisitos.mock';

/** Contrato de /files/:id/requisitos (SDD S2.4). `actor` lo usa solo el mock (bitácora de la demo). */
export interface ServicioRequisitos {
  listar(fileId: number): Promise<RequisitoDelFile[]>;
  registrar(fileId: number, codigo: string, d: DatosRequisito, actor: Usuario): Promise<RequisitoDelFile>;
}

/** Sigue al modo de files: los requisitos son parte del file. */
export const requisitosService: ServicioRequisitos = usaApi('files') ? requisitosApi : requisitosMock;
