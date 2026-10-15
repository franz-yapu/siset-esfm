import type { Entrega, EstadoTramite, HojaRuta, HojaRutaConTitular, Movimiento, TipoTramite, Usuario } from '@/types';
import { auditar, copia, db } from '@/mocks/db';
import { ahora, delay, diasDesde } from '@/lib/formato';
import {
  accionesDisponibles,
  aplicarTransicion,
  ErrorNegocio,
  type Accion,
  type AccionDisponible,
  type DatosTransicion,
} from '@/lib/transiciones';
import { conTitular, LATENCIA, ultimoMovimiento } from './_comun';

export interface FiltrosHojas {
  texto?: string;
  estado?: EstadoTramite | '';
  sedeId?: number | '';
  desde?: string;
  hasta?: string;
}

export interface NuevaHojaRuta {
  fileId: number;
  tipo: TipoTramite;
  nroValorado: string;
  obs?: string;
}

/** Días sin movimiento a partir de los cuales un trámite se marca como detenido. */
export const DIAS_DETENIDO = 10;

export const estaDetenido = (h: HojaRuta): boolean =>
  h.estado !== 'ENTREGADO' && diasDesde(ultimoMovimiento(h)) > DIAS_DETENIDO;

/** RF-08 CA2: HR-AAAA-NNNNNN, correlativo por gestión. En la API real va en una transacción con secuencia. */
const siguienteCorrelativo = (): string => {
  const gestion = new Date().getFullYear();
  const prefijo = `HR-${gestion}-`;
  const ultimo = Math.max(
    0,
    ...db.hojasRuta.filter((h) => h.nro.startsWith(prefijo)).map((h) => Number(h.nro.slice(prefijo.length))),
  );
  return `${prefijo}${String(ultimo + 1).padStart(6, '0')}`;
};

export const hojasRutaPrototipoService = {
  async listar(filtros: FiltrosHojas = {}): Promise<HojaRutaConTitular[]> {
    await delay(LATENCIA);
    const t = filtros.texto?.toLowerCase().trim();
    return db.hojasRuta
      .map(conTitular)
      .filter(
        (h) =>
          (!t || [h.nro, h.titular, h.ci].some((v) => v.toLowerCase().includes(t))) &&
          (!filtros.estado || h.estado === filtros.estado) &&
          (!filtros.sedeId || h.sedeActualId === filtros.sedeId) &&
          (!filtros.desde || h.fechaIngreso.slice(0, 10) >= filtros.desde) &&
          (!filtros.hasta || h.fechaIngreso.slice(0, 10) <= filtros.hasta),
      )
      .sort((a, b) => b.nro.localeCompare(a.nro));
  },

  async obtener(nro: string): Promise<HojaRutaConTitular> {
    await delay(LATENCIA);
    const h = db.hojasRuta.find((x) => x.nro === nro);
    if (!h) throw new ErrorNegocio('Trámite no encontrado');
    return conTitular(h);
  },

  /** Botones de acción de P-31 según estado, rol y sede. */
  acciones(nro: string, u: Usuario): AccionDisponible[] {
    const h = db.hojasRuta.find((x) => x.nro === nro);
    const f = h && db.files.find((x) => x.id === h.fileId);
    return h && f ? accionesDisponibles(h, f, u) : [];
  },

  async ejecutar(nro: string, accion: Accion, u: Usuario, datos?: DatosTransicion): Promise<HojaRutaConTitular> {
    await delay(LATENCIA);
    return conTitular(aplicarTransicion(nro, accion, u, datos));
  },

  /** P-34: registra a quién se entregó y cierra el trámite. */
  async registrarEntrega(nro: string, entrega: Omit<Entrega, 'fecha'> & { fecha?: string }, u: Usuario): Promise<void> {
    await delay(LATENCIA);
    if (!entrega.ciReceptor.trim()) throw new ErrorNegocio('El CI de quien recibe es obligatorio');
    const h = aplicarTransicion(nro, 'ENTREGAR', u, {
      obs: `Entregado a ${entrega.entregadoA.toLowerCase()} (CI ${entrega.ciReceptor.trim()})`,
    });
    h.entrega = { ...entrega, ciReceptor: entrega.ciReceptor.trim(), fecha: entrega.fecha || ahora() };
  },

  /** P-30: registra el trámite (y opcionalmente lo envía). Rechaza files bloqueados (S3.4). */
  async crear(datos: NuevaHojaRuta, enviar: boolean, u: Usuario): Promise<HojaRutaConTitular> {
    await delay(LATENCIA);
    const f = db.files.find((x) => x.id === datos.fileId);
    if (!f) throw new ErrorNegocio('Selecciona un titular');
    if (f.bloqueado) throw new ErrorNegocio('El file está bloqueado: no se puede registrar el trámite');
    if (!datos.nroValorado.trim()) throw new ErrorNegocio('El N.º de valorado es obligatorio');
    if (u.sedeId === null) throw new ErrorNegocio('Tu usuario no tiene sede');
    const fecha = ahora();
    const movimiento: Movimiento = {
      estado: 'REGISTRADO',
      fecha,
      sedeId: u.sedeId,
      usuario: u.nombre,
      obs: datos.obs?.trim() || undefined,
    };
    const nueva: HojaRuta = {
      nro: siguienteCorrelativo(),
      fileId: f.id,
      tipo: datos.tipo,
      estado: 'REGISTRADO',
      sedeActualId: u.sedeId,
      fechaIngreso: fecha,
      nroValorado: datos.nroValorado.trim(),
      movimientos: [movimiento],
    };
    db.hojasRuta.push(nueva);
    auditar(u.nombre, 'Hojas de ruta', 'Registrar hoja de ruta', nueva.nro, null, {
      file: f.codigo,
      tipo: datos.tipo,
      valorado: nueva.nroValorado,
    });
    if (enviar) aplicarTransicion(nueva.nro, 'ENVIAR_ANC', u, { obs: `Valorado N.º ${nueva.nroValorado}` });
    return conTitular(nueva);
  },

  /** P-21: solo los trámites del egresado logueado. */
  async misTramites(u: Usuario): Promise<HojaRutaConTitular[]> {
    await delay(LATENCIA);
    return db.hojasRuta
      .filter((h) => h.fileId === u.fileId)
      .map(conTitular)
      .sort((a, b) => b.nro.localeCompare(a.nro));
  },

  async miTramite(nro: string, u: Usuario): Promise<HojaRutaConTitular> {
    await delay(LATENCIA);
    const h = db.hojasRuta.find((x) => x.nro === nro && x.fileId === u.fileId);
    if (!h) throw new ErrorNegocio('Trámite no encontrado');
    return conTitular(h);
  },

  /**
   * P-02 / RF-09: consulta pública con N.º + CI. Mismo mensaje si falla cualquiera de los dos
   * (anti-enumeración) y sin datos personales más allá del nombre.
   */
  async seguimientoPublico(nro: string, ci: string) {
    await delay(LATENCIA);
    const h = db.hojasRuta.find((x) => x.nro === nro.trim().toUpperCase());
    const f = h && db.files.find((x) => x.id === h.fileId);
    if (!h || !f || f.ci !== ci.trim()) throw new ErrorNegocio('No encontramos un trámite con esos datos');
    return copia({
      nro: h.nro,
      tipo: h.tipo,
      estado: h.estado,
      sedeActualId: h.sedeActualId,
      fechaIngreso: h.fechaIngreso,
      titular: `${f.nombres} ${f.apellidos}`,
      movimientos: h.movimientos.map(({ estado, fecha, sedeId, usuario, obs }) => ({
        estado,
        fecha,
        sedeId,
        usuario,
        obs,
      })),
    });
  },
};
