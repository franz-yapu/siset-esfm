import type { ClienteBd, TransaccionBd } from '@/compartido/bd';
import { ErrorApp, ErrorConflicto, ErrorNegocio, ErrorNoEncontrado, ErrorProhibido } from '@/compartido/errores';
import { registrarEvento } from '@/modulos/auditoria';
import {
  bloquearHojaRuta,
  buscarHojaRuta,
  insertarMovimiento,
  listarMovimientos,
  type HojaRutaBd,
} from './hoja-ruta.repositorio';
import type { DetalleHojaRuta } from './hojas-ruta.esquemas';
import {
  accionesPosibles,
  evaluarTransicion,
  flujoDe,
  type AccionHojaRuta,
  type CodigoSede,
  type EstadoParaTransicion,
} from './maquina';

type Cliente = ClienteBd | TransaccionBd;

/** Quién hace la petición (lo saca la raíz del access token, ADR-0001). */
export interface SesionHojaRuta {
  usuarioId: number;
  rol: string;
  sedeId: number | null;
}

/** Lo que el módulo necesita de otros: la raíz arma estas funciones (ADR-0001). */
export interface DependenciasHojasRuta {
  bd: ClienteBd;
  obtenerTiposTramite(
    cliente: Cliente,
  ): Promise<{ id: number; codigo: string; nombre: string; requiereValorado: boolean }[]>;
  obtenerSedes(cliente: Cliente): Promise<{ id: number; codigo: string; nombre: string }[]>;
  /** Titular del trámite: nombre, CI y bloqueo del file (files + personas). */
  titularDeFile(cliente: Cliente, fileId: number): Promise<{ nombre: string; ci: string; bloqueado: boolean } | null>;
  describirUsuarios(ids: number[]): Promise<Map<number, { usuario: string; nombre: string }>>;
}

const CODIGO_ERROR = {
  TRANSICION_INVALIDA: (m: string) => new ErrorConflicto(m, undefined, 'TRANSICION_INVALIDA'),
  PROHIBIDO: (m: string) => new ErrorProhibido(m),
  FILE_BLOQUEADO: (m: string) => new ErrorNegocio(m, 'FILE_BLOQUEADO'),
} satisfies Record<string, (m: string) => ErrorApp>;

/** Máquina de estados de la hoja de ruta (SDD S3.1-S3.3 §2.4, ADR-0005). */
export function crearServicioHojasRuta(deps: DependenciasHojasRuta) {
  const { bd } = deps;

  async function contexto(cliente: Cliente, h: HojaRutaBd) {
    const [tipos, sedes, titular] = await Promise.all([
      deps.obtenerTiposTramite(cliente),
      deps.obtenerSedes(cliente),
      deps.titularDeFile(cliente, h.fileId),
    ]);
    const tipo = tipos.find((t) => t.id === h.tipoTramiteId);
    if (!tipo || !titular) throw new Error(`La hoja ${h.nroTramite} no tiene tipo o file.`);
    return { tipo, sedes, titular };
  }

  const sedeCodigo = (sedes: { id: number; codigo: string }[], id: number | null): CodigoSede | null => {
    const c = sedes.find((s) => s.id === id)?.codigo;
    return c === 'LA_PAZ' || c === 'ANCOCAGUA' ? c : null;
  };

  async function detalle(cliente: Cliente, nro: string, sesion: SesionHojaRuta): Promise<DetalleHojaRuta> {
    const h = await buscarHojaRuta(cliente, nro);
    if (!h) throw new ErrorNoEncontrado('La hoja de ruta no existe.');
    const { tipo, sedes, titular } = await contexto(cliente, h);
    const movimientos = await listarMovimientos(cliente, h.id);
    const usuarios = await deps.describirUsuarios([...new Set(movimientos.map((m) => m.usuarioId))]);
    const estado: EstadoParaTransicion = {
      estado: h.estadoActual,
      flujo: flujoDe(tipo.requiereValorado),
      fileBloqueado: titular.bloqueado,
    };
    const sedeActual = sedes.find((s) => s.id === h.sedeActualId);
    return {
      nro: h.nroTramite,
      gestion: h.gestion,
      tipo: { codigo: tipo.codigo, nombre: tipo.nombre, requiereValorado: tipo.requiereValorado },
      estado: h.estadoActual,
      sedeActual: { codigo: sedeActual?.codigo ?? '', nombre: sedeActual?.nombre ?? '' },
      nroValorado: h.nroValorado,
      fechaIngreso: h.fechaIngreso.toISOString(),
      fechaCierre: h.fechaCierre?.toISOString() ?? null,
      titular: { fileId: h.fileId, ...titular },
      movimientos: movimientos.map((m) => ({
        accion: m.accion,
        estadoAnterior: m.estadoAnterior,
        estadoNuevo: m.estadoNuevo,
        sede: sedes.find((s) => s.id === m.sedeId)?.codigo ?? '',
        usuario: { id: m.usuarioId, nombre: usuarios.get(m.usuarioId)?.nombre ?? '' },
        observacion: m.observacion,
        fecha: m.fecha.toISOString(),
      })),
      acciones: accionesPosibles(estado, { rol: sesion.rol, sede: sedeCodigo(sedes, sesion.sedeId) }),
    };
  }

  return {
    obtener: (nro: string, sesion: SesionHojaRuta) => detalle(bd, nro, sesion),

    /** Un paso del trámite: `FOR UPDATE`, validación, movimiento (el trigger actualiza la hoja) y evento. */
    async transicion(
      nro: string,
      accion: AccionHojaRuta,
      observacion: string | null,
      sesion: SesionHojaRuta,
    ): Promise<DetalleHojaRuta> {
      await bd.$transaction(async (tx) => {
        if ((await bloquearHojaRuta(tx, nro)) === null) throw new ErrorNoEncontrado('La hoja de ruta no existe.');
        const h = (await buscarHojaRuta(tx, nro))!;
        const { tipo, sedes, titular } = await contexto(tx, h);
        const r = evaluarTransicion(
          { estado: h.estadoActual, flujo: flujoDe(tipo.requiereValorado), fileBloqueado: titular.bloqueado },
          { rol: sesion.rol, sede: sedeCodigo(sedes, sesion.sedeId) },
          accion,
        );
        if (!r.ok) throw CODIGO_ERROR[r.error](r.mensaje);
        await insertarMovimiento(tx, {
          hojaRutaId: h.id,
          accion,
          estadoAnterior: h.estadoActual,
          estadoNuevo: r.transicion.hacia,
          sedeId: sesion.sedeId!,
          usuarioId: sesion.usuarioId,
          observacion,
        });
        await registrarEvento(tx, {
          accion: 'CAMBIAR_ESTADO',
          modulo: 'HOJAS_RUTA',
          entidad: 'hoja_ruta',
          entidadId: h.nroTramite,
          antes: { estado: h.estadoActual },
          despues: { estado: r.transicion.hacia, accion, observacion },
        });
      });
      return detalle(bd, nro, sesion);
    },
  };
}

export type ServicioHojasRuta = ReturnType<typeof crearServicioHojasRuta>;
