import type { Pagina } from '@/types/pagina';
import type { DetalleHojaRuta, FilaHojaRuta, FiltrosHojasRuta, TipoTramiteCatalogo } from '@/types/hojas-ruta';
import { api } from '@/lib/api';
import type { ServicioHojasRuta } from './hojasRuta.service';

/** Quita los filtros vacíos: la API pide `texto` de al menos 1 carácter. */
const parametros = (f: FiltrosHojasRuta): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries({ ...f, texto: f.texto?.trim() }).filter(
      (e): e is [string, string | number] => e[1] !== undefined && e[1] !== '',
    ),
  );

/** hojasRutaService contra la API (S3.1–S3.4, S3.8). Los errores llegan como `ErrorApi`. */
export const hojasRutaApi: ServicioHojasRuta = {
  async listar(f) {
    return (await api.get<Pagina<FilaHojaRuta>>('/hojas-ruta', { params: parametros(f) })).data;
  },
  async obtener(nro) {
    return (await api.get<DetalleHojaRuta>(`/hojas-ruta/${encodeURIComponent(nro)}`)).data;
  },
  async crear(d) {
    return (await api.post<DetalleHojaRuta>('/hojas-ruta', d)).data;
  },
  async transicion(nro, accion, observacion) {
    return (
      await api.post<DetalleHojaRuta>(`/hojas-ruta/${encodeURIComponent(nro)}/transiciones`, { accion, observacion })
    ).data;
  },
  async tipos() {
    return (await api.get<TipoTramiteCatalogo[]>('/hojas-ruta/tipos')).data;
  },
};
