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
import { api } from '@/lib/api';
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

  async crear(d: DatosCrearFile): Promise<FileDetalle> {
    return (await api.post<FileDetalle>('/files', d)).data;
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

  async especialidades(): Promise<Especialidad[]> {
    return (await api.get<Especialidad[]>('/catalogos/especialidades')).data;
  },
};
