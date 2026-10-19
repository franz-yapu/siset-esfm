import { useQuery } from '@tanstack/react-query';
import type { Usuario } from '@/types';
import type { EstadoHojaRuta } from '@/types/hojas-ruta';
import { filesService } from '@/services/files.service';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { requisitosService } from '@/services/requisitos.service';
import { notificaciones, type Notificacion } from '@/services/reportes.service';
import { todoMock } from '@/services/_modo';
import { alertasDelEstudiante } from '@/lib/requisitos';
import { claveHojasRuta } from './useHojasRuta';
import { useCambios } from './index';

/** Un aviso por cada estado que espera un paso de este rol (DEC-033), con su bandeja. */
type Regla = {
  estado: EstadoHojaRuta;
  texto: (n: number) => string;
  to: string;
  valorado?: boolean;
  /** Solo los recibidos en esa sede (ADR-0011): Calahumana y Ancocagua tienen bandejas propias. */
  sedeIngreso?: 'LA_PAZ' | 'ANCOCAGUA';
};

/** "1 trámite" / "2 trámites". */
const de = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const REGLAS: Partial<Record<Usuario['rol'], Regla[]>> = {
  SEC_DIR: [
    {
      estado: 'RECIBIDO',
      sedeIngreso: 'LA_PAZ',
      texto: (n) => `${de(n, 'trámite', 'trámites')} por avisar a Kardex`,
      to: '/hojas-ruta?estado=RECIBIDO',
    },
    {
      estado: 'IMPRESO',
      valorado: true,
      texto: (n) => `${de(n, 'trámite', 'trámites')} por registrar la firma de Dirección Académica`,
      to: '/hojas-ruta?estado=IMPRESO',
    },
    {
      estado: 'FIRMADO_DIR_ACADEMICA',
      texto: (n) => `${de(n, 'trámite', 'trámites')} por registrar la firma de Dirección General`,
      to: '/hojas-ruta?estado=FIRMADO_DIR_ACADEMICA',
    },
    {
      estado: 'REMITIDO_CALAHUMANA',
      texto: (n) => `${de(n, 'certificado', 'certificados')} por recibir de Ancocagua`,
      to: '/hojas-ruta?estado=REMITIDO_CALAHUMANA',
    },
    {
      estado: 'LISTO',
      texto: (n) => `${de(n, 'trámite listo', 'trámites listos')} para entregar`,
      to: '/hojas-ruta?estado=LISTO',
    },
  ],
  KARDEX: [
    { estado: 'AVISADO_KARDEX', texto: (n) => `${de(n, 'trámite', 'trámites')} por recoger`, to: '/revision' },
    { estado: 'EN_IMPRESION', texto: (n) => `${de(n, 'trámite', 'trámites')} por imprimir`, to: '/emision' },
    {
      estado: 'FIRMADO_COORDINADOR',
      sedeIngreso: 'LA_PAZ',
      texto: (n) => `${de(n, 'certificado', 'certificados')} por remitir`,
      to: '/revision',
    },
  ],
  // D-32b (ADR-0011): los certificados que Secretaría de Coordinación recibe en Ancocagua.
  SEC_COORD: [
    {
      estado: 'RECIBIDO',
      sedeIngreso: 'ANCOCAGUA',
      texto: (n) => `${de(n, 'certificado', 'certificados')} por derivar a Kardex`,
      to: '/entregas',
    },
    {
      estado: 'FIRMADO_COORDINADOR',
      sedeIngreso: 'ANCOCAGUA',
      texto: (n) => `${de(n, 'certificado firmado', 'certificados firmados')} por entregar`,
      to: '/entregas',
    },
  ],
  COORDINADOR: [
    {
      estado: 'IMPRESO',
      valorado: false,
      texto: (n) => (n === 1 ? '1 certificado espera tu firma' : `${n} certificados esperan tu firma`),
      to: '/firmas',
    },
  ],
};

/** Cuántos trámites hay en el estado; con `valorado`, solo los de ese flujo (por tipo). */
async function contar(r: Regla): Promise<number> {
  if (r.valorado === undefined)
    return (await hojasRutaService.listar({ estado: r.estado, sedeIngreso: r.sedeIngreso, porPagina: 1 })).total;
  const tipos = (await hojasRutaService.tipos()).filter((t) => t.requiereValorado === r.valorado);
  const totales = await Promise.all(
    tipos.map(
      async (t) => (await hojasRutaService.listar({ estado: r.estado, tipoTramite: t.codigo, porPagina: 1 })).total,
    ),
  );
  return totales.reduce((a, b) => a + b, 0);
}

async function avisosApi(u: Usuario): Promise<Notificacion[]> {
  if (u.rol === 'ESTUDIANTE') {
    const [f, requisitos] = await Promise.all([filesService.mio(u), requisitosService.mios(u)]);
    return alertasDelEstudiante(f.bloqueado, requisitos).map((texto) => ({ texto, to: '/mi-file' }));
  }
  const reglas = REGLAS[u.rol] ?? [];
  const cantidades = await Promise.all(reglas.map(contar));
  const avisos = reglas
    .map((r, i) => ({ texto: r.texto(cantidades[i]), to: r.to, n: cantidades[i] }))
    .filter((a) => a.n > 0)
    .map(({ texto, to }) => ({ texto, to }));
  if (u.rol === 'KARDEX') {
    const bloqueados = (await filesService.listar({ bloqueado: true, porPagina: 1 })).total;
    if (bloqueados)
      avisos.push({ texto: de(bloqueados, 'file bloqueado', 'files bloqueados'), to: '/files?bloqueados=1' });
  }
  return avisos;
}

/**
 * Campana del encabezado (DEC-044): con la API, los pasos que esperan a este rol; solo con todo en mock, la demo
 * del prototipo. Se refresca al cambiar algo (invalida `hojas-ruta`) y cada minuto.
 */
export function useNotificaciones(u: Usuario): Notificacion[] {
  const demo = todoMock();
  useCambios();
  const { data } = useQuery({
    queryKey: [...claveHojasRuta, 'avisos', u.id, u.rol],
    queryFn: () => avisosApi(u),
    enabled: !demo,
    refetchInterval: 60_000,
    retry: false,
  });
  return demo ? notificaciones(u) : (data ?? []);
}
