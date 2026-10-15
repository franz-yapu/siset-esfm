import type { ClienteBd, Prisma, TransaccionBd } from '@/compartido/bd';
import {
  ErrorApp,
  ErrorConflicto,
  ErrorNegocio,
  ErrorNoEncontrado,
  ErrorProhibido,
  ErrorValidacion,
} from '@/compartido/errores';
import { desplazamiento, type Pagina } from '@/compartido/http';
import { registrarEvento } from '@/modulos/auditoria';
import {
  bloquearHojaRuta,
  buscarHojaRuta,
  insertarHojaRuta,
  insertarMovimiento,
  listarHojasRuta,
  listarMovimientos,
  siguienteNroHojaRuta,
  type HojaRutaBd,
} from './hoja-ruta.repositorio';
import type { DatosCrearHojaRuta, DetalleHojaRuta, FilaHojaRuta, FiltrosHojasRuta } from './hojas-ruta.esquemas';
import {
  accionesPosibles,
  evaluarTransicion,
  flujoDe,
  INGESTA,
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
  ): Promise<{ id: number; codigo: string; nombre: string; requiereValorado: boolean; activo: boolean }[]>;
  obtenerSedes(cliente: Cliente): Promise<{ id: number; codigo: string; nombre: string }[]>;
  /** Titular del trámite: nombre, CI y bloqueo del file (files + personas). */
  titularDeFile(
    cliente: Cliente,
    fileId: number,
  ): Promise<{ nombre: string; ci: string; bloqueado: boolean; condicion: 'ESTUDIANTE' | 'EGRESADO' } | null>;
  /** Titulares de varios files, para una página de la lista. */
  titularesDeFiles(cliente: Cliente, fileIds: number[]): Promise<Map<number, { nombre: string; ci: string }>>;
  /** Files cuyos titulares coinciden por CI o nombre (búsqueda de la lista). */
  buscarFileIdsPorTitular(cliente: Cliente, texto: string): Promise<number[]>;
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
      titular: { fileId: h.fileId, nombre: titular.nombre, ci: titular.ci, bloqueado: titular.bloqueado },
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

  /** Año en La Paz (UTC−4): la gestión del correlativo (ADR-0006). */
  const gestionActual = () => new Date(Date.now() - 4 * 60 * 60_000).getUTCFullYear();

  return {
    obtener: (nro: string, sesion: SesionHojaRuta) => detalle(bd, nro, sesion),

    /** Ingesta (SDD S3.2-S3.4 §2.2): correlativo, hoja RECIBIDA, primer movimiento y evento, en una transacción. */
    async crear(datos: DatosCrearHojaRuta, sesion: SesionHojaRuta): Promise<DetalleHojaRuta> {
      const sedes = await deps.obtenerSedes(bd);
      if (sesion.rol !== INGESTA.rol || sedeCodigo(sedes, sesion.sedeId) !== INGESTA.sede) {
        throw new ErrorProhibido('La ingesta la registra Secretaría de Dirección en Calahumana.');
      }
      const tipo = (await deps.obtenerTiposTramite(bd)).find((t) => t.codigo === datos.tipoTramite && t.activo);
      if (!tipo) throw new ErrorNegocio('El tipo de trámite no existe.', 'TIPO_TRAMITE_INEXISTENTE');
      if (tipo.requiereValorado && !datos.nroValorado) {
        throw new ErrorValidacion([{ ruta: 'body.nroValorado', mensaje: 'Este trámite necesita el N.º de valorado' }]);
      }
      if (!tipo.requiereValorado && datos.nroValorado) {
        throw new ErrorValidacion([{ ruta: 'body.nroValorado', mensaje: 'Este trámite no lleva valorado (D-05)' }]);
      }
      const titular = await deps.titularDeFile(bd, datos.fileId);
      if (!titular) throw new ErrorNegocio('El file no existe.', 'FILE_INEXISTENTE');
      if (titular.condicion !== 'EGRESADO') {
        throw new ErrorNegocio('Solo se registran trámites de egresados (D-09).', 'FILE_NO_EGRESADO');
      }
      if (titular.bloqueado) {
        throw new ErrorNegocio(
          'El file del titular está bloqueado: no se puede registrar el trámite.',
          'FILE_BLOQUEADO',
        );
      }

      const nro = await bd.$transaction(async (tx) => {
        const gestion = gestionActual();
        const nroTramite = await siguienteNroHojaRuta(tx, gestion);
        const { id } = await insertarHojaRuta(tx, {
          nroTramite,
          gestion,
          fileId: datos.fileId,
          tipoTramiteId: tipo.id,
          sedeActualId: sesion.sedeId!,
          nroValorado: datos.nroValorado,
        });
        await insertarMovimiento(tx, {
          hojaRutaId: id,
          accion: 'REGISTRAR',
          estadoAnterior: null,
          estadoNuevo: INGESTA.hacia,
          sedeId: sesion.sedeId!,
          usuarioId: sesion.usuarioId,
          observacion: datos.observacion,
        });
        await registrarEvento(tx, {
          accion: 'CREAR',
          modulo: 'HOJAS_RUTA',
          entidad: 'hoja_ruta',
          entidadId: nroTramite,
          despues: {
            tipo: tipo.codigo,
            fileId: datos.fileId,
            nroValorado: datos.nroValorado,
            observacion: datos.observacion,
          },
        });
        return nroTramite;
      });
      return detalle(bd, nro, sesion);
    },

    /** Lista paginada, más recientes primero (SDD S3.2-S3.4 §2.3). */
    async listar(f: FiltrosHojasRuta): Promise<Pagina<FilaHojaRuta>> {
      const [tipos, sedes] = await Promise.all([deps.obtenerTiposTramite(bd), deps.obtenerSedes(bd)]);
      const where: Prisma.HojaRutaWhereInput[] = [];
      if (f.estado) where.push({ estadoActual: f.estado });
      if (f.gestion) where.push({ gestion: f.gestion });
      if (f.tipoTramite) where.push({ tipoTramiteId: tipos.find((t) => t.codigo === f.tipoTramite)?.id ?? -1 });
      if (f.texto) {
        const fileIds = await deps.buscarFileIdsPorTitular(bd, f.texto);
        where.push({ OR: [{ nroTramite: { contains: f.texto, mode: 'insensitive' } }, { fileId: { in: fileIds } }] });
      }
      const { skip, take } = desplazamiento(f);
      const { filas, total } = await listarHojasRuta(bd, { AND: where }, skip, take);
      const titulares = await deps.titularesDeFiles(bd, [...new Set(filas.map((h) => h.fileId))]);
      return {
        datos: filas.map((h) => {
          const tipo = tipos.find((t) => t.id === h.tipoTramiteId)!;
          return {
            nro: h.nroTramite,
            gestion: h.gestion,
            tipo: { codigo: tipo.codigo, nombre: tipo.nombre },
            estado: h.estadoActual,
            sedeActual: sedes.find((s) => s.id === h.sedeActualId)?.codigo ?? '',
            titular: { fileId: h.fileId, ...(titulares.get(h.fileId) ?? { nombre: '', ci: '' }) },
            nroValorado: h.nroValorado,
            fechaIngreso: h.fechaIngreso.toISOString(),
            fechaCierre: h.fechaCierre?.toISOString() ?? null,
          };
        }),
        pagina: f.pagina,
        porPagina: f.porPagina,
        total,
      };
    },

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
