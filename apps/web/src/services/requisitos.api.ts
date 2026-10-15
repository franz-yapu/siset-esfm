import type { DatosRequisito, RequisitoDelFile } from '@/types/requisitos';
import { api } from '@/lib/api';
import type { ServicioRequisitos } from './requisitos.service';

/** requisitosService contra la API de S2.4. Los errores llegan como `ErrorApi`. */
export const requisitosApi: ServicioRequisitos = {
  async listar(fileId: number): Promise<RequisitoDelFile[]> {
    return (await api.get<RequisitoDelFile[]>(`/files/${fileId}/requisitos`)).data;
  },

  async mios(): Promise<RequisitoDelFile[]> {
    return (await api.get<RequisitoDelFile[]>('/files/mio/requisitos')).data;
  },

  async registrar(fileId: number, codigo: string, d: DatosRequisito): Promise<RequisitoDelFile> {
    return (await api.put<RequisitoDelFile>(`/files/${fileId}/requisitos/${encodeURIComponent(codigo)}`, d)).data;
  },
};
