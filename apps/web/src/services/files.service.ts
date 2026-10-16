import type { Usuario } from '@/types';
import type { Pagina } from '@/types/pagina';
import type {
  Bloqueo,
  CambiosFile,
  DatosBloqueo,
  DatosCrearFile,
  Especialidad,
  FileDetalle,
  FiltrosFiles,
} from '@/types/files';
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
  /** "Mi file" del estudiante (S2.7): la API lo toma de la sesión; el mock, de `actor.fileId`. */
  mio(actor: Usuario): Promise<FileDetalle>;
  crear(d: DatosCrearFile, actor: Usuario): Promise<FileDetalle>;
  editar(id: number, c: CambiosFile, actor: Usuario): Promise<FileDetalle>;
  /** Por licencia temporal, con la resolución y su PDF (D-29, DEC-049). La glosa queda como motivo del file. */
  bloquear(id: number, d: DatosBloqueo, actor: Usuario): Promise<FileDetalle>;
  /** Sin datos (DEC-049 #4): quién y cuándo los pone la API. */
  desbloquear(id: number, actor: Usuario): Promise<FileDetalle>;
  /** El bloqueo abierto, o `null` si no hay (o es de antes de DEC-049, sin resolución). */
  bloqueo(id: number): Promise<Bloqueo | null>;
  /** El PDF de la resolución del bloqueo abierto. */
  pdfBloqueo(id: number): Promise<Blob>;
  especialidades(): Promise<Especialidad[]>;
}

/** Mock o API según VITE_USAR_API (SDD S0.8 §2.3). Con la API: `auth,files` o `true`, nunca `files` solo. */
export const filesService: ServicioFiles = usaApi('files') ? filesApi : filesMock;
