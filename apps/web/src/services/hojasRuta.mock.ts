import type { Usuario } from '@/types';
import type { DetalleHojaRuta, FilaHojaRuta } from '@/types/hojas-ruta';
import { auditar, copia, db } from '@/mocks/db';
import { TIPOS_TRAMITE_MOCK, type HojaRutaMock } from '@/mocks/hojas-ruta-v2';
import { SEDES } from '@/config/catalogos';
import { sedeHr } from '@/config/estados-hoja-ruta';
import { delay } from '@/lib/formato';
import { ErrorApi } from '@/lib/errores';
import { accionesPosibles, evaluarTransicion, flujoDe, INGESTA, type CodigoSede } from '@/lib/maquina-hojas-ruta';
import { aDetalle } from './files.mock';
import { LATENCIA } from './_comun';
import type { ServicioHojasRuta } from './hojasRuta.service';

// Mock con el contrato de la API (SDD S3.8-S3.9 §2.1). Mismas reglas y códigos de error que la API.

const MODULO = 'Hojas de ruta';
const STATUS = { TRANSICION_INVALIDA: 409, PROHIBIDO: 403, FILE_BLOQUEADO: 422 } as const;

const sedeDe = (u: Usuario): CodigoSede | null => {
  const c = SEDES.find((s) => s.id === u.sedeId)?.codigo;
  return c === 'LA_PAZ' || c === 'ANCOCAGUA' ? c : null;
};
const tipoDe = (codigo: string) => TIPOS_TRAMITE_MOCK.find((t) => t.codigo === codigo)!;
const fileDe = (id: number) => {
  const f = db.files.find((x) => x.id === id);
  if (!f) throw new Error(`File ${id} no existe`);
  return f;
};
const buscar = (nro: string): HojaRutaMock => {
  const h = db.hojasRutaV2.find((x) => x.nro === nro.trim().toUpperCase());
  if (!h) throw new ErrorApi('La hoja de ruta no existe.', 'NO_ENCONTRADO', 404);
  return h;
};

const detalle = (h: HojaRutaMock, u: Usuario): DetalleHojaRuta => {
  const f = fileDe(h.fileId);
  const tipo = tipoDe(h.tipo);
  return copia({
    nro: h.nro,
    gestion: h.gestion,
    tipo,
    estado: h.estado,
    sedeActual: { codigo: h.sedeActual, nombre: sedeHr(h.sedeActual) },
    nroValorado: h.nroValorado,
    fechaIngreso: h.fechaIngreso,
    fechaCierre: h.fechaCierre,
    titular: { fileId: f.id, nombre: aDetalle(f).nombre, ci: f.ci, bloqueado: f.bloqueado },
    movimientos: h.movimientos.map((m, i) => ({
      accion: m.accion,
      estadoAnterior: m.estadoAnterior,
      estadoNuevo: m.estadoNuevo,
      sede: m.sede,
      usuario: { id: i, nombre: m.usuario },
      observacion: m.observacion,
      fecha: m.fecha,
    })),
    acciones: accionesPosibles(
      { estado: h.estado, flujo: flujoDe(tipo.requiereValorado), fileBloqueado: f.bloqueado },
      { rol: u.rol, sede: sedeDe(u) },
    ),
  });
};

const fila = (h: HojaRutaMock): FilaHojaRuta => {
  const f = fileDe(h.fileId);
  const tipo = tipoDe(h.tipo);
  return {
    nro: h.nro,
    gestion: h.gestion,
    tipo: { codigo: tipo.codigo, nombre: tipo.nombre },
    estado: h.estado,
    sedeActual: h.sedeActual,
    titular: { fileId: f.id, nombre: aDetalle(f).nombre, ci: f.ci },
    nroValorado: h.nroValorado,
    fechaIngreso: h.fechaIngreso,
    fechaCierre: h.fechaCierre,
  };
};

export const hojasRutaMock: ServicioHojasRuta = {
  async listar(f) {
    await delay(LATENCIA);
    const t = f.texto?.trim().toLowerCase();
    const filas = db.hojasRutaV2
      .map(fila)
      .filter(
        (h) =>
          (!t || [h.nro, h.titular.ci, h.titular.nombre].some((v) => v.toLowerCase().includes(t))) &&
          (!f.estado || h.estado === f.estado) &&
          (!f.tipoTramite || h.tipo.codigo === f.tipoTramite) &&
          (!f.gestion || h.gestion === f.gestion),
      )
      .sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso));
    const pagina = f.pagina ?? 1;
    const porPagina = f.porPagina ?? 20;
    return {
      datos: filas.slice((pagina - 1) * porPagina, pagina * porPagina),
      pagina,
      porPagina,
      total: filas.length,
    };
  },

  async obtener(nro, u) {
    await delay(LATENCIA);
    return detalle(buscar(nro), u);
  },

  async crear(d, u) {
    await delay(LATENCIA);
    if (u.rol !== INGESTA.rol || sedeDe(u) !== INGESTA.sede) {
      throw new ErrorApi('La ingesta la registra Secretaría de Dirección en Calahumana.', 'PROHIBIDO', 403);
    }
    const tipo = TIPOS_TRAMITE_MOCK.find((t) => t.codigo === d.tipoTramite);
    if (!tipo) throw new ErrorApi('El tipo de trámite no existe.', 'TIPO_TRAMITE_INEXISTENTE', 422);
    const valorado = d.nroValorado?.trim() || null;
    if (tipo.requiereValorado !== Boolean(valorado)) {
      const mensaje = valorado ? 'Este trámite no lleva valorado (D-05)' : 'Este trámite necesita el N.º de valorado';
      throw new ErrorApi('Los datos enviados no son válidos.', 'VALIDACION', 400, [
        { ruta: 'body.nroValorado', mensaje },
      ]);
    }
    const f = db.files.find((x) => x.id === d.fileId);
    if (!f) throw new ErrorApi('El file no existe.', 'FILE_INEXISTENTE', 422);
    if (f.condicion !== 'EGRESADO') {
      throw new ErrorApi('Solo se registran trámites de egresados (D-09).', 'FILE_NO_EGRESADO', 422);
    }
    if (f.bloqueado) {
      throw new ErrorApi(
        'El file del titular está bloqueado: no se puede registrar el trámite.',
        'FILE_BLOQUEADO',
        422,
      );
    }
    const gestion = new Date().getFullYear();
    const prefijo = `HR-${gestion}-`;
    const ultimo = Math.max(
      0,
      ...db.hojasRutaV2.filter((h) => h.nro.startsWith(prefijo)).map((h) => Number(h.nro.slice(prefijo.length))),
    );
    const fecha = new Date().toISOString();
    const h: HojaRutaMock = {
      nro: `${prefijo}${String(ultimo + 1).padStart(6, '0')}`,
      gestion,
      fileId: f.id,
      tipo: tipo.codigo,
      estado: 'RECIBIDO',
      sedeActual: 'LA_PAZ',
      nroValorado: valorado,
      fechaIngreso: fecha,
      fechaCierre: null,
      movimientos: [
        {
          accion: 'REGISTRAR',
          estadoAnterior: null,
          estadoNuevo: 'RECIBIDO',
          sede: 'LA_PAZ',
          usuario: u.nombre,
          observacion: d.observacion?.trim() || null,
          fecha,
        },
      ],
    };
    db.hojasRutaV2.push(h);
    auditar(u.nombre, MODULO, 'Registrar hoja de ruta', h.nro, null, { tipo: tipo.codigo, valorado });
    return detalle(h, u);
  },

  async transicion(nro, accion, observacion, u) {
    await delay(LATENCIA);
    const h = buscar(nro);
    const tipo = tipoDe(h.tipo);
    const r = evaluarTransicion(
      { estado: h.estado, flujo: flujoDe(tipo.requiereValorado), fileBloqueado: fileDe(h.fileId).bloqueado },
      { rol: u.rol, sede: sedeDe(u) },
      accion,
    );
    if (!r.ok) throw new ErrorApi(r.mensaje, r.error, STATUS[r.error]);
    const fecha = new Date().toISOString();
    h.movimientos.push({
      accion,
      estadoAnterior: h.estado,
      estadoNuevo: r.transicion.hacia,
      sede: r.transicion.sede,
      usuario: u.nombre,
      observacion: observacion?.trim() || null,
      fecha,
    });
    auditar(u.nombre, MODULO, r.transicion.etiqueta, h.nro, { estado: h.estado }, { estado: r.transicion.hacia });
    h.estado = r.transicion.hacia;
    h.sedeActual = r.transicion.sede;
    if (h.estado === 'ENTREGADO') h.fechaCierre = fecha;
    return detalle(h, u);
  },

  async tipos() {
    await delay(LATENCIA);
    return copia([...TIPOS_TRAMITE_MOCK].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
  },
  async seguimiento(nro, ci) {
    await delay(LATENCIA);
    const h = db.hojasRutaV2.find((x) => x.nro === nro.trim().toUpperCase());
    const f = h && db.files.find((x) => x.id === h.fileId);
    if (!h || !f || f.ci !== ci.trim()) {
      throw new ErrorApi('No encontramos un trámite con esos datos.', 'NO_ENCONTRADO', 404);
    }
    return copia({
      nro: h.nro,
      tipo: tipoDe(h.tipo).nombre,
      estado: h.estado,
      sedeActual: sedeHr(h.sedeActual),
      fechaIngreso: h.fechaIngreso,
      fechaCierre: h.fechaCierre,
      titular: aDetalle(f).nombre,
      pasos: h.movimientos.map((m) => ({ estado: m.estadoNuevo, sede: sedeHr(m.sede), fecha: m.fecha })),
    });
  },
};
