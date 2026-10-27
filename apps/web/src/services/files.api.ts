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
import { api } from '@/lib/api';
import { ErrorApi } from '@/lib/errores';
import type { ServicioFiles } from './files.service';

/** Quita los filtros vacíos: la API pide `texto` de al menos 1 carácter. */
const parametros = (f: FiltrosFiles): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries({ ...f, texto: f.texto?.trim() }).filter(
      (e): e is [string, string | number | boolean] => e[1] !== undefined && e[1] !== '',
    ),
  );

/** filesService contra la API de S2.2. Los errores llegan como `ErrorApi` por el interceptor de `lib/api.ts`. */
export const filesApi: ServicioFiles = {
  async listar(f: FiltrosFiles): Promise<Pagina<FileDetalle>> {
    return (await api.get<Pagina<FileDetalle>>('/files', { params: parametros(f) })).data;
  },

  async obtener(id: number): Promise<FileDetalle> {
    return (await api.get<FileDetalle>(`/files/${id}`)).data;
  },

  async mio(): Promise<FileDetalle> {
    return (await api.get<FileDetalle>('/files/mio')).data;
  },

  async crear(d: DatosCrearFile): Promise<FileCreado> {
    return (await api.post<FileCreado>('/files', d)).data;
  },

  async importar(filas: DatosCrearFile[], aplicar: boolean): Promise<ResultadoImportacion> {
    // Crear cuentas calcula una contraseña por estudiante: puede tardar más que el límite general.
    return (await api.post<ResultadoImportacion>('/files/importacion', { filas, aplicar }, { timeout: 180_000 })).data;
  },

  async editar(id: number, c: CambiosFile): Promise<FileDetalle> {
    return (await api.patch<FileDetalle>(`/files/${id}`, c)).data;
  },

  /** `multipart/form-data`: Axios pone el límite del formulario al ver el `FormData`. */
  async bloquear(id: number, d: DatosBloqueo): Promise<FileDetalle> {
    const formulario = new FormData();
    formulario.append('causa', d.causa);
    formulario.append('nroResolucion', d.nroResolucion);
    formulario.append('fechaResolucion', d.fechaResolucion);
    formulario.append('glosa', d.glosa);
    formulario.append('pdf', d.pdf, d.pdf.name);
    // Un PDF de 5 MB por una conexión lenta tarda más que los 15 s de siempre.
    return (await api.post<FileDetalle>(`/files/${id}/bloqueo`, formulario, { timeout: 120_000 })).data;
  },

  async desbloquear(id: number): Promise<FileDetalle> {
    return (await api.post<FileDetalle>(`/files/${id}/desbloqueo`, {})).data;
  },

  async bloqueo(id: number): Promise<Bloqueo | null> {
    return (await api.get<Bloqueo | null>(`/files/${id}/bloqueo`)).data;
  },

  async pdfBloqueo(id: number): Promise<Blob> {
    return (await api.get<Blob>(`/files/${id}/bloqueo/pdf`, { responseType: 'blob', timeout: 120_000 })).data;
  },

  async editarMio(c: CambiosContacto): Promise<FileDetalle> {
    return (await api.patch<FileDetalle>('/files/mio', c)).data;
  },

  async foto(id: FileOMio): Promise<Blob | null> {
    try {
      return (await api.get<Blob>(`/files/${id}/foto`, { responseType: 'blob' })).data;
    } catch (e) {
      // Sin foto: 404. Cualquier otro error se muestra.
      if (e instanceof ErrorApi && e.estado === 404) return null;
      throw e;
    }
  },

  async guardarFoto(id: FileOMio, foto: Blob): Promise<FileDetalle> {
    const datos = new FormData();
    datos.append('foto', foto, 'foto.jpg');
    return (await api.put<FileDetalle>(`/files/${id}/foto`, datos)).data;
  },

  async quitarFoto(id: FileOMio): Promise<FileDetalle> {
    return (await api.delete<FileDetalle>(`/files/${id}/foto`)).data;
  },

  async especialidades(): Promise<Especialidad[]> {
    return (await api.get<Especialidad[]>('/catalogos/especialidades')).data;
  },
};
