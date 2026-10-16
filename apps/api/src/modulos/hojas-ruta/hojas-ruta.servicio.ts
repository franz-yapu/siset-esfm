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
  datosReporte,
  buscarHojaRuta,
  insertarHojaRuta,
  insertarMovimiento,
  listarHojasRuta,
  listarMovimientos,
  siguienteNroHojaRuta,
  type HojaRutaBd,
} from './hoja-ruta.repositorio';
import type {
  DatosCrearHojaRuta,
  DetalleHojaRuta,
  FilaHojaRuta,
  FiltrosHojasRuta,
  FiltrosReporte,
  ReporteHojasRuta,
  Seguimiento,
  TipoTramite,
} from './hojas-ruta.esquemas';
import {
  ESTADOS_HOJA_RUTA,
  accionesPosibles,
  evaluarTransicion,
  flujoDe,
  PIDEN_OBSERVACION,
  INGESTA,
  type AccionHojaRuta,
  type CodigoSede,
  type EstadoParaTransicion,
} from './maquina';

type Cliente = ClienteBd | TransaccionBd;

/** Horas sin movimiento desde las que un trámite en curso está atrasado: debe responderse en 48 a 72 h (D-44). */
export const HORAS_DETENIDO = 72;
const DIA = 24 * 60 * 60_000;
const redondear = (n: number) => Math.round(n * 10) / 10;

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

    /**
     * Seguimiento público (RF-09, S4.1): el mismo 404 si no existe el N.º o si el CI no es del titular, para no
     * revelar qué trámites existen (anti-enumeración).
     */
    async seguimiento(nro: string, ci: string): Promise<Seguimiento> {
      const noEncontrado = new ErrorNoEncontrado('No encontramos un trámite con esos datos.');
      const h = await buscarHojaRuta(bd, nro);
      if (!h) throw noEncontrado;
      const { tipo, sedes, titular } = await contexto(bd, h);
      const dado = ci.trim().toUpperCase();
      if (titular.ci.toUpperCase() !== dado && titular.ci.split('-')[0] !== dado) throw noEncontrado;
      const nombreSede = (id: number) => sedes.find((s) => s.id === id)?.nombre ?? '';
      const movimientos = await listarMovimientos(bd, h.id);
      return {
        nro: h.nroTramite,
        tipo: tipo.nombre,
        estado: h.estadoActual,
        sedeActual: nombreSede(h.sedeActualId),
        fechaIngreso: h.fechaIngreso.toISOString(),
        fechaCierre: h.fechaCierre?.toISOString() ?? null,
        titular: titular.nombre,
        pasos: movimientos.map((m) => ({
          estado: m.estadoNuevo,
          sede: nombreSede(m.sedeId),
          fecha: m.fecha.toISOString(),
        })),
      };
    },

    /** Reporte de trámites (RF-13, S6.1-S6.2): todo se calcula sobre los trámites que entran en los filtros. */
    async reporte(f: FiltrosReporte): Promise<ReporteHojasRuta> {
      const [tipos, sedes] = await Promise.all([deps.obtenerTiposTramite(bd), deps.obtenerSedes(bd)]);
      const where: Prisma.HojaRutaWhereInput[] = [];
      // Días de La Paz (UTC−4), como la gestión del correlativo.
      if (f.desde) where.push({ fechaIngreso: { gte: new Date(`${f.desde}T00:00:00-04:00`) } });
      if (f.hasta)
        where.push({ fechaIngreso: { lt: new Date(new Date(`${f.hasta}T00:00:00-04:00`).getTime() + DIA) } });
      if (f.tipoTramite) where.push({ tipoTramiteId: tipos.find((t) => t.codigo === f.tipoTramite)?.id ?? -1 });
      const { hojas, movimientos } = await datosReporte(bd, { AND: where });
      const ahora = Date.now();

      // Cerradas: entregadas o devueltas (DEC-053); el tiempo promedio es solo de las entregadas.
      const cerradas = hojas.filter((h) => h.fechaCierre);
      const entregadas = cerradas.filter((h) => h.estadoActual === 'ENTREGADO');
      const porHoja = new Map<number, typeof movimientos>();
      for (const m of movimientos) porHoja.set(m.hojaRutaId, [...(porHoja.get(m.hojaRutaId) ?? []), m]);

      // Tiempo en cada estado: de que se entró a él hasta el movimiento siguiente.
      const etapas = new Map<string, number[]>();
      for (const lista of porHoja.values()) {
        for (let i = 1; i < lista.length; i++) {
          const desde = lista[i - 1];
          etapas.set(desde.estadoNuevo, [
            ...(etapas.get(desde.estadoNuevo) ?? []),
            (lista[i].fecha.getTime() - desde.fecha.getTime()) / DIA,
          ]);
        }
      }
      const promedio = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(ahora - 4 * 60 * 60_000);
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() - (5 - i));
        return d.toISOString().slice(0, 7);
      });
      const mesDe = (d: Date) => new Date(d.getTime() - 4 * 60 * 60_000).toISOString().slice(0, 7);

      const quietos = hojas
        .filter((h) => !h.fechaCierre)
        .map((h) => {
          const ultimo = porHoja.get(h.id)?.at(-1)?.fecha ?? h.fechaIngreso;
          const horas = Math.floor((ahora - ultimo.getTime()) / (60 * 60_000));
          return { h, horas, dias: Math.floor(horas / 24) };
        })
        .filter((x) => x.horas > HORAS_DETENIDO)
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 50);
      const titulares = await deps.titularesDeFiles(bd, [...new Set(quietos.map((x) => x.h.fileId))]);

      return {
        total: hojas.length,
        enCurso: hojas.length - cerradas.length,
        entregados: entregadas.length,
        devueltos: cerradas.length - entregadas.length,
        tiempoPromedioDias: entregadas.length
          ? redondear(promedio(entregadas.map((h) => (h.fechaCierre!.getTime() - h.fechaIngreso.getTime()) / DIA)))
          : null,
        porEstado: ESTADOS_HOJA_RUTA.map((estado) => ({
          estado,
          total: hojas.filter((h) => h.estadoActual === estado).length,
        })),
        porTipo: tipos.map((t) => ({
          codigo: t.codigo,
          nombre: t.nombre,
          total: hojas.filter((h) => h.tipoTramiteId === t.id).length,
        })),
        porMes: meses.map((mes) => ({ mes, total: hojas.filter((h) => mesDe(h.fechaIngreso) === mes).length })),
        porEtapa: ESTADOS_HOJA_RUTA.filter((e) => etapas.has(e)).map((estado) => ({
          estado,
          dias: redondear(promedio(etapas.get(estado)!)),
        })),
        detenidos: quietos.map(({ h, horas, dias }) => ({
          nro: h.nroTramite,
          titular: titulares.get(h.fileId)?.nombre ?? '',
          estado: h.estadoActual,
          sedeActual: sedes.find((s) => s.id === h.sedeActualId)?.codigo ?? '',
          horas,
          dias,
        })),
      };
    },

    /** Catálogo de tipos activos para la ingesta (SDD S3.8-S3.9 §2.2). */
    async tipos(): Promise<TipoTramite[]> {
      return (await deps.obtenerTiposTramite(bd))
        .filter((t) => t.activo)
        .map(({ codigo, nombre, requiereValorado }) => ({ codigo, nombre, requiereValorado }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    },

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
        if (PIDEN_OBSERVACION.includes(accion) && !observacion)
          throw new ErrorValidacion([
            { ruta: 'body.observacion', mensaje: 'Escriba la observación por la que se devuelve' },
          ]);
        // DEC-053: el historial queda anotado con el valorado en que se imprimió.
        if (accion === 'IMPRIMIR' && h.nroValorado)
          observacion = [`Impreso en el valorado N.º ${h.nroValorado}.`, observacion]
            .filter(Boolean)
            .join(' ')
            .slice(0, 255);
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
