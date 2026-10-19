import type { ClienteBd, TransaccionBd } from '@/compartido/bd';
import { ErrorNegocio, ErrorNoEncontrado, ErrorValidacion } from '@/compartido/errores';
import { obtenerContexto } from '@/compartido/http';
import { registrarEvento } from '@/modulos/auditoria';
import { buscarFile, type FileBd } from './file.repositorio';
import { guardarRequisitoDelFile, listarRequisitosDelFile, type RequisitoFileBd } from './requisito.repositorio';
import {
  gestionesEsperadas,
  requisitoAplica,
  requisitoAtrasado,
  resumenDeGestiones,
  type RequisitoParaReglas,
} from './requisitos-reglas';
import type { DatosRequisito, RegistroDeGestion, RequisitoDelFile } from './requisitos.esquemas';

type Cliente = ClienteBd | TransaccionBd;

/** Un requisito del catálogo, tal como lo da catalogos (la raíz pasa la función, ADR-0001). */
export interface RequisitoCatalogoFiles extends RequisitoParaReglas {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  nivel: 'BASICO' | 'INTERMEDIO' | 'AVANZADO' | null;
  orden: number;
  pideCurso: boolean;
}

export interface DependenciasRequisitos {
  bd: ClienteBd;
  obtenerRequisitosActivos(cliente: Cliente): Promise<RequisitoCatalogoFiles[]>;
  /** Nombre de quien registró: seguridad + personas, armado por la raíz (como la bitácora, S6.4). */
  describirUsuarios(ids: number[]): Promise<Map<number, { usuario: string; nombre: string }>>;
}

const deFecha = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const aFecha = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null);

const CAMPOS = ['estado', 'fecha', 'nroDocumento', 'observacion', 'nombreCurso', 'entidadEmisora'] as const;

/** Lo que el formulario compara contra lo guardado. */
type Registro = Pick<RequisitoDelFile, (typeof CAMPOS)[number]>;

const SIN_REGISTRO: Registro = {
  estado: 'PENDIENTE',
  fecha: null,
  nroDocumento: null,
  observacion: null,
  nombreCurso: null,
  entidadEmisora: null,
};

/** Reglas que dependen del tipo de requisito (DEC-051); los mensajes van debajo de cada campo. */
function exigirSegunTipo(tipo: RequisitoCatalogoFiles, d: DatosRequisito) {
  const problemas: { ruta: string; mensaje: string }[] = [];
  if (tipo.porGestion && !d.gestion) {
    problemas.push({ ruta: 'body.gestion', mensaje: 'Indique la gestión (I/2025, II/2025 o 2023)' });
  }
  if (!tipo.porGestion && d.gestion) {
    problemas.push({ ruta: 'body.gestion', mensaje: 'Este requisito no se registra por gestión' });
  }
  if (tipo.pideCurso && d.estado === 'COMPLETO') {
    if (!d.nombreCurso) problemas.push({ ruta: 'body.nombreCurso', mensaje: 'Escriba el nombre del curso' });
    if (!d.entidadEmisora) problemas.push({ ruta: 'body.entidadEmisora', mensaje: 'Escriba la entidad emisora' });
  }
  if (!tipo.pideCurso && (d.nombreCurso || d.entidadEmisora)) {
    problemas.push({ ruta: 'body.nombreCurso', mensaje: 'Este requisito no lleva curso ni entidad emisora' });
  }
  if (problemas.length) throw new ErrorValidacion(problemas);
}

/** Requisitos del file (SDD S2.4, DEC-051). Las rutas ya pasaron por `autorizar('requisitos', …)`. */
export function crearServicioRequisitos({ bd, obtenerRequisitosActivos, describirUsuarios }: DependenciasRequisitos) {
  async function cargarFile(cliente: Cliente, id: number): Promise<FileBd> {
    const f = await buscarFile(cliente, id);
    if (!f) throw new ErrorNoEncontrado('El file no existe.');
    return f;
  }

  async function armar(
    catalogo: RequisitoCatalogoFiles[],
    filas: RequisitoFileBd[],
    file: FileBd,
  ): Promise<RequisitoDelFile[]> {
    const porTipo = new Map<number, RequisitoFileBd[]>();
    for (const f of filas) porTipo.set(f.requisitoTipoId, [...(porTipo.get(f.requisitoTipoId) ?? []), f]);
    const ids = [...new Set(filas.map((f) => f.registradoPor).filter((id): id is number => id !== null))];
    const usuarios = await describirUsuarios(ids);
    const quien = (id: number | null) => (id === null ? null : { id, nombre: usuarios.get(id)?.nombre ?? '' });

    return catalogo.map((r) => {
      const registros = porTipo.get(r.id) ?? [];
      const gestiones: RegistroDeGestion[] = r.porGestion
        ? registros
            .filter((g) => g.gestion !== '')
            .map((g) => ({
              gestion: g.gestion,
              estado: g.estado,
              fecha: deFecha(g.fecha),
              nroDocumento: g.nroDocumento,
              observacion: g.observacion,
              registradoPor: quien(g.registradoPor),
              actualizado: g.updatedAt.toISOString(),
            }))
        : [];
      const unico = r.porGestion ? undefined : registros.find((g) => g.gestion === '');
      const esperadas = r.porGestion ? gestionesEsperadas(r, file) : null;
      const estado = r.porGestion ? resumenDeGestiones(gestiones, esperadas!) : (unico?.estado ?? 'PENDIENTE');
      const aplica = requisitoAplica(r, file);
      return {
        codigo: r.codigo,
        nombre: r.nombre,
        descripcion: r.descripcion,
        anioFormacion: r.anioFormacion,
        nivel: r.nivel,
        obligatorio: r.obligatorio,
        orden: r.orden,
        porGestion: r.porGestion,
        pideCurso: r.pideCurso,
        soloGenero: r.soloGenero,
        soloModalidad: r.soloModalidad,
        soloAniosTerminados: r.soloAniosTerminados,
        gestionesEsperadas: esperadas,
        aplica,
        atrasado: aplica && r.obligatorio && requisitoAtrasado(r, file, estado),
        estado,
        fecha: deFecha(unico?.fecha ?? null),
        nroDocumento: unico?.nroDocumento ?? null,
        observacion: unico?.observacion ?? null,
        nombreCurso: unico?.nombreCurso ?? null,
        entidadEmisora: unico?.entidadEmisora ?? null,
        registradoPor: quien(unico?.registradoPor ?? null),
        actualizado: unico?.updatedAt.toISOString() ?? null,
        gestiones,
      };
    });
  }

  async function listar(fileId: number): Promise<RequisitoDelFile[]> {
    const file = await cargarFile(bd, fileId);
    // El egresado ya se tituló: presentó todo antes y no se le piden requisitos (DEC-060).
    if (file.condicion === 'EGRESADO') return [];
    return armar(await obtenerRequisitosActivos(bd), await listarRequisitosDelFile(bd, fileId), file);
  }

  return {
    listar,

    /**
     * Registra o actualiza uno (SDD S2.4 §2.1); en los por gestión, el de esa gestión (DEC-051). Sin cambios
     * reales: no escribe ni registra.
     */
    async registrar(fileId: number, codigo: string, datos: DatosRequisito): Promise<RequisitoDelFile> {
      const file = await cargarFile(bd, fileId);
      if (file.condicion === 'EGRESADO') {
        throw new ErrorNegocio('Los egresados no tienen requisitos: ya se titularon (DEC-060).', 'FILE_EGRESADO');
      }
      const catalogo = await obtenerRequisitosActivos(bd);
      const tipo = catalogo.find((r) => r.codigo === codigo);
      if (!tipo) throw new ErrorNoEncontrado('Ese requisito no existe en el catálogo.');
      exigirSegunTipo(tipo, datos);
      const gestion = datos.gestion ?? '';

      const lista = await armar(catalogo, await listarRequisitosDelFile(bd, fileId), file);
      const item = lista.find((r) => r.codigo === codigo)!;
      const actual: Registro = tipo.porGestion
        ? { ...SIN_REGISTRO, ...item.gestiones.find((g) => g.gestion === gestion) }
        : item;
      const antes: Record<string, unknown> = {};
      const despues: Record<string, unknown> = {};
      for (const c of CAMPOS) {
        if (actual[c] !== datos[c]) {
          antes[c] = actual[c];
          despues[c] = datos[c];
        }
      }
      if (Object.keys(despues).length === 0) return item;

      return bd.$transaction(async (tx) => {
        await guardarRequisitoDelFile(tx, fileId, tipo.id, gestion, {
          estado: datos.estado,
          fecha: aFecha(datos.fecha),
          nroDocumento: datos.nroDocumento,
          observacion: datos.observacion,
          nombreCurso: datos.nombreCurso,
          entidadEmisora: datos.entidadEmisora,
          // Quien registró: el usuario de la sesión (lo dejó `autenticar` en el contexto).
          registradoPor: obtenerContexto()?.usuarioId ?? null,
        });
        // En el historial del file (S2.10): EDITAR del file con el código del requisito (§2.3) y su gestión.
        const clave = tipo.porGestion ? { requisito: codigo, gestion } : { requisito: codigo };
        await registrarEvento(tx, {
          accion: 'EDITAR',
          modulo: 'FILES',
          entidad: 'file_academico',
          entidadId: fileId,
          antes: { ...clave, ...antes },
          despues: { ...clave, ...despues },
        });
        const filas = await listarRequisitosDelFile(tx, fileId);
        return (await armar(catalogo, filas, file)).find((r) => r.codigo === codigo)!;
      });
    },
  };
}

export type ServicioRequisitos = ReturnType<typeof crearServicioRequisitos>;
