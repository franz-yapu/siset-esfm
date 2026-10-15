import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Usuario } from '@/types';
import { ESTADOS_HOJA_RUTA, type EstadoHojaRuta, type FiltrosHojasRuta, type FiltrosReporte } from '@/types/hojas-ruta';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { avisarCambio } from './index';

// TanStack Query para P-30, P-31 y P-32 (SDD S3.8-S3.9 §2.3). Capa fina encima de hojasRutaService.

export const claveHojasRuta = ['hojas-ruta'] as const;

export const useHojasRuta = (filtros: FiltrosHojasRuta) =>
  useQuery({
    queryKey: [...claveHojasRuta, 'lista', filtros],
    queryFn: () => hojasRutaService.listar(filtros),
    placeholderData: keepPreviousData,
  });

export const useHojaRuta = (nro: string, actor: Usuario) =>
  useQuery({
    queryKey: [...claveHojasRuta, 'una', nro, actor.id],
    queryFn: () => hojasRutaService.obtener(nro, actor),
    enabled: Boolean(nro),
    retry: false,
  });

/** El catálogo no cambia durante la sesión. */
export const useTiposTramite = () =>
  useQuery({ queryKey: ['tipos-tramite'], queryFn: () => hojasRutaService.tipos(), staleTime: Infinity });

/** Crear o mover: al terminar bien invalida la lista y el detalle, y avisa del cambio (la campana). */
export function useMutacionHojasRuta<A, R>(fn: (a: A) => Promise<R>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      avisarCambio();
      await cliente.invalidateQueries({ queryKey: claveHojasRuta });
    },
  });
}

/** Indicadores del inicio de SEC_DIR: solo el `total` de cada consulta, y los 5 últimos. */
export const useResumenHojasRuta = () =>
  useQuery({
    queryKey: [...claveHojasRuta, 'resumen'],
    queryFn: async () => {
      const contar = async (estado: FiltrosHojasRuta['estado']) =>
        (await hojasRutaService.listar({ estado, porPagina: 1 })).total;
      const [porAvisar, impresos, remitidos, listos, ultimos] = await Promise.all([
        contar('RECIBIDO'),
        contar('IMPRESO'),
        contar('REMITIDO_CALAHUMANA'),
        contar('LISTO'),
        hojasRutaService.listar({ porPagina: 5 }),
      ]);
      return { porAvisar, impresos, remitidos, listos, ultimos: ultimos.datos };
    },
  });

/**
 * Los certificados (tipos sin valorado: los únicos que firma el Coordinador, D-05/D-11) en esos estados, los más
 * antiguos primero. La API filtra por un tipo y un estado a la vez.
 */
async function certificados(estados: readonly EstadoHojaRuta[]) {
  const tipos = (await hojasRutaService.tipos()).filter((t) => !t.requiereValorado);
  const paginas = await Promise.all(
    tipos.flatMap((t) =>
      estados.map((estado) => hojasRutaService.listar({ estado, tipoTramite: t.codigo, porPagina: 100 })),
    ),
  );
  return paginas.flatMap((p) => p.datos).sort((a, b) => a.fechaIngreso.localeCompare(b.fechaIngreso));
}

/** Después de su firma (FIRMA_COORDINADOR): de FIRMADO_COORDINADOR en adelante, en el flujo sin valorado. */
const DESPUES_DE_FIRMAR = ['FIRMADO_COORDINADOR', 'REMITIDO_CALAHUMANA', 'LISTO', 'ENTREGADO'] as const;

/** P-50 · Firmas del Coordinador: lo que espera su firma y lo que ya firmó. No hay dictamen (D-11). */
export const useFirmasCoordinador = () =>
  useQuery({
    queryKey: [...claveHojasRuta, 'firmas-coordinador'],
    queryFn: async () => {
      const [pendientes, firmados] = await Promise.all([certificados(['IMPRESO']), certificados(DESPUES_DE_FIRMAR)]);
      return { pendientes, firmados: firmados.reverse() };
    },
  });

/**
 * Inicio del Coordinador (D-20): lo que espera su firma (certificados IMPRESOS, flujo sin valorado), cuántos están
 * en curso y entregados, y cuántos hay en cada estado.
 */
export const useResumenCoordinador = () =>
  useQuery({
    queryKey: [...claveHojasRuta, 'resumen-coordinador'],
    queryFn: async () => {
      const [firmar, porEstado] = await Promise.all([
        certificados(['IMPRESO']),
        Promise.all(
          ESTADOS_HOJA_RUTA.map(async (estado) => ({
            estado,
            total: (await hojasRutaService.listar({ estado, porPagina: 1 })).total,
          })),
        ),
      ]);
      const entregados = porEstado.find((e) => e.estado === 'ENTREGADO')!.total;
      const total = porEstado.reduce((s, e) => s + e.total, 0);
      return { firmar, enCurso: total - entregados, entregados, porEstado };
    },
  });

/** Inicio de Kardex: los trámites que esperan un paso suyo (recoger, imprimir, remitir). */
export const useResumenKardexHojas = () =>
  useQuery({
    queryKey: [...claveHojasRuta, 'resumen-kardex'],
    queryFn: async () => {
      const [porRecoger, enImpresion, porRemitir] = await Promise.all(
        (['AVISADO_KARDEX', 'EN_IMPRESION', 'FIRMADO_COORDINADOR'] as const).map(
          async (estado) => (await hojasRutaService.listar({ estado, porPagina: 1 })).total,
        ),
      );
      return { porRecoger, enImpresion, porRemitir };
    },
  });

/** Bandejas de Kardex (P-43, P-44): los trámites de cada estado, los más antiguos primero. */
export const useBandejasHojasRuta = (estados: readonly EstadoHojaRuta[]) =>
  useQuery({
    queryKey: [...claveHojasRuta, 'bandejas', estados],
    queryFn: () =>
      Promise.all(
        estados.map(async (estado) =>
          (await hojasRutaService.listar({ estado, porPagina: 100 })).datos.sort((a, b) =>
            a.fechaIngreso.localeCompare(b.fechaIngreso),
          ),
        ),
      ),
  });

/** Cuántos trámites hay en cada estado pedido, y los 5 últimos (inicio de SEC_COORD, solo lectura). */
export const useConteosHojasRuta = (estados: readonly EstadoHojaRuta[]) =>
  useQuery({
    queryKey: [...claveHojasRuta, 'conteos', estados],
    queryFn: async () => {
      const [totales, ultimos] = await Promise.all([
        Promise.all(estados.map(async (estado) => (await hojasRutaService.listar({ estado, porPagina: 1 })).total)),
        hojasRutaService.listar({ porPagina: 5 }),
      ]);
      return { totales, ultimos: ultimos.datos };
    },
  });

export const useReporteHojasRuta = (f: FiltrosReporte) =>
  useQuery({
    queryKey: [...claveHojasRuta, 'reporte', f],
    queryFn: () => hojasRutaService.reporte(f),
    placeholderData: keepPreviousData,
  });
