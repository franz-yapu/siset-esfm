import type { EstadoTramite, HojaRuta, TipoTramite, Usuario } from '@/types';
import { db } from '@/mocks/db';
import { ORDEN_ESTADOS } from '@/config/estados';
import { aIso, delay, diasDesde, mesCorto } from '@/lib/formato';
import { parseISO, differenceInHours } from 'date-fns';
import { conTitular, LATENCIA, ultimoMovimiento } from './_comun';
import { HORAS_DETENIDO, estaDetenido } from './hojasRuta-prototipo.service';
import { alertasFile, fileHabilitado } from '@/lib/reglas';

export interface FiltrosReporte {
  desde?: string;
  hasta?: string;
  sedeId?: number | '';
  tipo?: TipoTramite | '';
}

const filtrar = (f: FiltrosReporte): HojaRuta[] =>
  db.hojasRuta.filter(
    (h) =>
      (!f.desde || h.fechaIngreso.slice(0, 10) >= f.desde) &&
      (!f.hasta || h.fechaIngreso.slice(0, 10) <= f.hasta) &&
      (!f.sedeId || h.sedeActualId === f.sedeId) &&
      (!f.tipo || h.tipo === f.tipo),
  );

const diasEntre = (a: string, b: string): number => differenceInHours(parseISO(b), parseISO(a)) / 24;

const promedio = (xs: number[]): number =>
  xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : 0;

/** Tiempo total del trámite: ingreso → entrega, o ingreso → hoy si sigue en curso. */
const duracion = (h: HojaRuta): number =>
  h.estado === 'ENTREGADO' ? diasEntre(h.fechaIngreso, ultimoMovimiento(h)) : diasDesde(h.fechaIngreso);

/** Etapas para el gráfico de tiempo promedio (agrupa estados vecinos). */
const ETAPAS: { nombre: string; estados: EstadoTramite[] }[] = [
  { nombre: 'Ingreso y envío', estados: ['REGISTRADO', 'EN_TRANSITO_ANC'] },
  { nombre: 'Revisión Kardex', estados: ['RECIBIDO', 'EN_REVISION', 'OBSERVADO'] },
  { nombre: 'Dictamen', estados: ['DICTAMINADO'] },
  { nombre: 'Emisión', estados: ['EN_IMPRESION'] },
  { nombre: 'Retorno a La Paz', estados: ['EN_TRANSITO_LP'] },
  { nombre: 'Firma y entrega', estados: ['EN_FIRMA', 'LISTO'] },
];

export const reportesService = {
  async kpis(f: FiltrosReporte = {}) {
    await delay(LATENCIA);
    const hs = filtrar(f);
    return {
      total: hs.length,
      enCurso: hs.filter((h) => h.estado !== 'ENTREGADO').length,
      entregados: hs.filter((h) => h.estado === 'ENTREGADO').length,
      tiempoPromedio: promedio(hs.map(duracion)),
      detenidos: hs.filter(estaDetenido).length,
    };
  },

  async porEstado(f: FiltrosReporte = {}): Promise<{ estado: EstadoTramite; total: number }[]> {
    await delay(LATENCIA);
    const hs = filtrar(f);
    return ORDEN_ESTADOS.map((estado) => ({ estado, total: hs.filter((h) => h.estado === estado).length }));
  },

  /** Ingresados por mes, últimos 6 meses. */
  async porMes(f: FiltrosReporte = {}): Promise<{ mes: string; total: number }[]> {
    await delay(LATENCIA);
    const hs = filtrar(f);
    const base = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (5 - i), 1);
      const clave = aIso(d).slice(0, 7);
      return { mes: mesCorto(aIso(d)), total: hs.filter((h) => h.fechaIngreso.startsWith(clave)).length };
    });
  },

  /** Promedio de días que un trámite pasa en cada etapa (de los movimientos registrados). */
  async tiempoPorEtapa(f: FiltrosReporte = {}): Promise<{ etapa: string; dias: number }[]> {
    await delay(LATENCIA);
    const hs = filtrar(f);
    return ETAPAS.map((e) => {
      const tramos = hs.flatMap((h) =>
        h.movimientos.flatMap((m, i) => {
          if (!e.estados.includes(m.estado)) return [];
          const sig = h.movimientos[i + 1];
          return sig ? [diasEntre(m.fecha, sig.fecha)] : [];
        }),
      );
      return { etapa: e.nombre, dias: promedio(tramos) };
    });
  },

  async detenidos(f: FiltrosReporte = {}) {
    await delay(LATENCIA);
    return filtrar(f)
      .filter(estaDetenido)
      .map((h) => ({ ...conTitular(h), dias: diasDesde(ultimoMovimiento(h)) }))
      .sort((a, b) => b.dias - a.dias);
  },

  /** Números de los inicios por rol (P-12 a P-15). */
  async resumenInicio() {
    await delay(LATENCIA);
    const hs = db.hojasRuta;
    const hoy = aIso(new Date()).slice(0, 10);
    const cuenta = (e: EstadoTramite) => hs.filter((h) => h.estado === e).length;
    const movHoy = (e: EstadoTramite) =>
      hs.filter((h) => h.movimientos.some((m) => m.estado === e && m.fecha.startsWith(hoy))).length;
    const esteMes = hoy.slice(0, 7);
    return {
      ingresadosHoy: hs.filter((h) => h.fechaIngreso.startsWith(hoy)).length,
      enTransitoAnc: cuenta('EN_TRANSITO_ANC'),
      enTransitoLp: cuenta('EN_TRANSITO_LP'),
      listos: cuenta('LISTO'),
      recibidosHoyAnc: movHoy('RECIBIDO'),
      derivadosKardexHoy: movHoy('EN_REVISION'),
      pendientesDictamen: hs.filter((h) => h.estado === 'EN_REVISION' && h.enviadoDictamen).length,
      observados: cuenta('OBSERVADO'),
      dictaminadosMes: db.dictamenes.filter((d) => d.fecha.startsWith(esteMes)).length,
      tiempoPromedio: promedio(hs.map(duracion)),
      filesBloqueados: db.files.filter((x) => x.bloqueado).length,
      enRevision: hs.filter((h) => ['RECIBIDO', 'EN_REVISION'].includes(h.estado)).length,
      porImprimir: hs.filter(
        (h) => h.estado === 'DICTAMINADO' && db.files.some((x) => x.id === h.fileId && fileHabilitado(x)),
      ).length,
      horasDetenido: HORAS_DETENIDO,
    };
  },
};

export interface Notificacion {
  texto: string;
  to: string;
}

/** Campana del header: pendientes del rol (en la v1.0 no hay correo/WhatsApp, D-19). */
export const notificaciones = (u: Usuario): Notificacion[] => {
  const hs = db.hojasRuta;
  const n = (cond: (h: HojaRuta) => boolean) => hs.filter(cond).length;
  const lista: Notificacion[] = [];
  const add = (cantidad: number, texto: string, to: string) => {
    if (cantidad > 0) lista.push({ texto: texto.replace('#', String(cantidad)), to });
  };
  switch (u.rol) {
    case 'SEC_DIR':
      add(
        n((h) => h.estado === 'EN_TRANSITO_LP'),
        '# retornos por recibir',
        '/pases',
      );
      add(
        n((h) => h.estado === 'LISTO'),
        '# trámites listos para entrega',
        '/entregas',
      );
      break;
    case 'SEC_COORD':
      add(
        n((h) => h.estado === 'EN_TRANSITO_ANC'),
        '# pases por recibir',
        '/pases',
      );
      break;
    case 'KARDEX':
      add(
        n((h) => h.estado === 'EN_TRANSITO_ANC'),
        '# pases por recibir',
        '/pases',
      );
      add(
        n((h) => h.estado === 'RECIBIDO'),
        '# trámites recibidos sin revisar',
        '/revision',
      );
      add(
        n((h) => h.estado === 'DICTAMINADO'),
        '# documentos por emitir',
        '/emision',
      );
      add(db.files.filter((f) => f.bloqueado).length, '# files bloqueados', '/files?bloqueados=1');
      break;
    case 'COORDINADOR':
      add(
        n((h) => h.estado === 'EN_REVISION' && Boolean(h.enviadoDictamen)),
        '# certificados esperan tu firma',
        '/firmas',
      );
      break;
    default: {
      const f = db.files.find((x) => x.id === u.fileId);
      if (f) alertasFile(f).forEach((texto) => lista.push({ texto, to: '/mi-file' }));
      if (u.rol === 'EGRESADO')
        add(
          n((h) => h.fileId === u.fileId && h.estado === 'LISTO'),
          'Tu trámite está listo para recoger',
          '/mis-tramites',
        );
    }
  }
  return lista;
};
