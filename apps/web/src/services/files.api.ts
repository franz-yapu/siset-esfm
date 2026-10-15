import type { Pagina } from '@/types/pagina';
import type { CambiosFile, DatosCrearFile, Especialidad, FileDetalle, FiltrosFiles } from '@/types/files';
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

  async bloquear(id: number, motivo: string): Promise<FileDetalle> {
    return (await api.post<FileDetalle>(`/files/${id}/bloqueo`, { motivo })).data;
  },

  async desbloquear(id: number, resolucion: string): Promise<FileDetalle> {
    return (await api.post<FileDetalle>(`/files/${id}/desbloqueo`, { resolucion })).data;
  },

  async especialidades(): Promise<Especialidad[]> {
    return (await api.get<Especialidad[]>('/catalogos/especialidades')).data;
  },
};
