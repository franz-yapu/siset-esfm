import type { Usuario } from '@/types';
import type { Pagina } from '@/types/pagina';
import type { CambiosFile, DatosCrearFile, Especialidad, FileDetalle, FiltrosFiles } from '@/types/files';
import { usaApi } from './_modo';
import { filesApi } from './files.api';
import { filesMock } from './files.mock';

/**
 * Contrato de /api/v1/files (SDD S2.2, DEC-027). Lo usan P-40, P-41 y P-42; el resto de las pantallas
 * sigue con `filesPrototipoService` hasta su ticket (DEC-028). `actor` lo usa solo el mock (bitácora de
 * la demo); la API toma el autor del token.
 */
export interface ServicioFiles {
  listar(f: FiltrosFiles): Promise<Pagina<FileDetalle>>;
  obtener(id: number): Promise<FileDetalle>;
  crear(d: DatosCrearFile, actor: Usuario): Promise<FileDetalle>;
  editar(id: number, c: CambiosFile, actor: Usuario): Promise<FileDetalle>;
  /** Por el permiso obligatorio de una gestión (D-07b, SDD S2.6). */
  bloquear(id: number, motivo: string, actor: Usuario): Promise<FileDetalle>;
  /** Con el número de la resolución, que queda en la bitácora. */
  desbloquear(id: number, resolucion: string, actor: Usuario): Promise<FileDetalle>;
  especialidades(): Promise<Especialidad[]>;
}

/** Mock o API según VITE_USAR_API (SDD S0.8 §2.3). Con la API: `auth,files` o `true`, nunca `files` solo. */
export const filesService: ServicioFiles = usaApi('files') ? filesApi : filesMock;
