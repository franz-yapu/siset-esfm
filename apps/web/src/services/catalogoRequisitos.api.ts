import type { RequisitoAdmin } from '@/types/catalogo-requisitos';
import { api } from '@/lib/api';
import type { ServicioCatalogoRequisitos } from './catalogoRequisitos.service';

/** catalogoRequisitosService contra /catalogos/requisitos (DEC-055). Los errores llegan como `ErrorApi`. */
export const catalogoRequisitosApi: ServicioCatalogoRequisitos = {
  async listar() {
    return (await api.get<RequisitoAdmin[]>('/catalogos/requisitos/todos')).data;
  },
  async crear(d) {
    return (await api.post<RequisitoAdmin>('/catalogos/requisitos', d)).data;
  },
  async editar(id, c) {
    return (await api.patch<RequisitoAdmin>(`/catalogos/requisitos/${id}`, c)).data;
  },
  async darDeBaja(id) {
    return (await api.post<RequisitoAdmin>(`/catalogos/requisitos/${id}/baja`)).data;
  },
  async reactivar(id) {
    return (await api.post<RequisitoAdmin>(`/catalogos/requisitos/${id}/reactivar`)).data;
  },
};
