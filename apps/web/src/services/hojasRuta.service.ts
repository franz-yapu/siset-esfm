import type { Usuario } from '@/types';
import type { Pagina } from '@/types/pagina';
import type {
  AccionHojaRuta,
  DatosCrearHojaRuta,
  DetalleHojaRuta,
  FilaHojaRuta,
  FiltrosHojasRuta,
  Seguimiento,
  TipoTramiteCatalogo,
} from '@/types/hojas-ruta';
import { usaApi } from './_modo';
import { hojasRutaApi } from './hojasRuta.api';
import { hojasRutaMock } from './hojasRuta.mock';

/**
 * Contrato de /api/v1/hojas-ruta (SDD S3.8-S3.9, DEC-037). Lo usan P-30, P-31 y P-32; el resto de las pantallas
 * sigue con `hojasRutaPrototipoService` hasta su ticket. `actor` lo usa solo el mock; la API toma el token.
 */
export interface ServicioHojasRuta {
  listar(f: FiltrosHojasRuta): Promise<Pagina<FilaHojaRuta>>;
  obtener(nro: string, actor: Usuario): Promise<DetalleHojaRuta>;
  crear(d: DatosCrearHojaRuta, actor: Usuario): Promise<DetalleHojaRuta>;
  transicion(nro: string, accion: AccionHojaRuta, observacion: string | null, actor: Usuario): Promise<DetalleHojaRuta>;
  tipos(): Promise<TipoTramiteCatalogo[]>;
  /** Pública, sin sesión (RF-09): N.º + CI del titular. */
  seguimiento(nro: string, ci: string): Promise<Seguimiento>;
}

export const hojasRutaService: ServicioHojasRuta = usaApi('hojasRuta') ? hojasRutaApi : hojasRutaMock;
