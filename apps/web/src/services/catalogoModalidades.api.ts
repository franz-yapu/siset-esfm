import type { ModalidadAdmin, ModalidadIngreso } from '@/types/catalogo-requisitos';
import { api } from '@/lib/api';
import type { ServicioCatalogoModalidades } from './catalogoModalidades.service';

/** catalogoModalidadesService contra /catalogos/modalidades (DEC-058). Los errores llegan como `ErrorApi`. */
export const catalogoModalidadesApi: ServicioCatalogoModalidades = {
  async activas() {
    return (await api.get<ModalidadIngreso[]>('/catalogos/modalidades')).data;
  },
  async listar() {
    return (await api.get<ModalidadAdmin[]>('/catalogos/modalidades/todas')).data;
  },
  async crear(d) {
    return (await api.post<ModalidadAdmin>('/catalogos/modalidades', d)).data;
  },
  async editar(id, c) {
    return (await api.patch<ModalidadAdmin>(`/catalogos/modalidades/${id}`, c)).data;
  },
  async darDeBaja(id) {
    return (await api.post<ModalidadAdmin>(`/catalogos/modalidades/${id}/baja`)).data;
  },
  async reactivar(id) {
    return (await api.post<ModalidadAdmin>(`/catalogos/modalidades/${id}/reactivar`)).data;
  },
};
