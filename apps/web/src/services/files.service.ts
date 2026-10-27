import type { Usuario } from '@/types';
import type { Pagina } from '@/types/pagina';
import type {
  Bloqueo,
  CambiosContacto,
  CambiosFile,
  DatosBloqueo,
  DatosCrearFile,
  Especialidad,
  FileCreado,
  FileDetalle,
  FileOMio,
  FiltrosFiles,
  ResultadoImportacion,
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
  /** Un estudiante queda además con su cuenta (DEC-064 #4): la respuesta dice qué pasó con ella. */
  crear(d: DatosCrearFile, actor: Usuario): Promise<FileCreado>;
  /** Desde el Excel (DEC-064 #3): `aplicar` false solo revisa; true escribe todo, o nada si hay errores. */
  importar(filas: DatosCrearFile[], aplicar: boolean, actor: Usuario): Promise<ResultadoImportacion>;
  editar(id: number, c: CambiosFile, actor: Usuario): Promise<FileDetalle>;
  /** El estudiante cambia su correo, celular o dirección (ADR-0013). */
  editarMio(c: CambiosContacto, actor: Usuario): Promise<FileDetalle>;
  /** La foto, o null si no tiene (ADR-0013). */
  foto(id: FileOMio, actor: Usuario): Promise<Blob | null>;
  guardarFoto(id: FileOMio, foto: Blob, actor: Usuario): Promise<FileDetalle>;
  quitarFoto(id: FileOMio, actor: Usuario): Promise<FileDetalle>;
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
