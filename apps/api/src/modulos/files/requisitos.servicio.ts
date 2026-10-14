import type { ClienteBd, TransaccionBd } from '@/compartido/bd';
import { ErrorNoEncontrado } from '@/compartido/errores';
import { obtenerContexto } from '@/compartido/http';
import { registrarEvento } from '@/modulos/auditoria';
import { buscarFile } from './file.repositorio';
import { guardarRequisitoDelFile, listarRequisitosDelFile, type RequisitoFileBd } from './requisito.repositorio';
import type { DatosRequisito, RequisitoDelFile } from './requisitos.esquemas';

type Cliente = ClienteBd | TransaccionBd;

/** Un requisito del catálogo, tal como lo da catalogos (la raíz pasa la función, ADR-0001). */
export interface RequisitoCatalogoFiles {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  anioFormacion: number | null;
  nivel: 'BASICO' | 'INTERMEDIO' | 'AVANZADO' | null;
  obligatorio: boolean;
}

export interface DependenciasRequisitos {
  bd: ClienteBd;
  obtenerRequisitosActivos(cliente: Cliente): Promise<RequisitoCatalogoFiles[]>;
  /** Nombre de quien registró: seguridad + personas, armado por la raíz (como la bitácora, S6.4). */
  describirUsuarios(ids: number[]): Promise<Map<number, { usuario: string; nombre: string }>>;
}

const deFecha = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const aFecha = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null);

const CAMPOS = ['estado', 'fecha', 'nroDocumento', 'observacion'] as const;

/** Requisitos del file (SDD S2.4). Las rutas ya pasaron por `autorizar('requisitos', …)`. */
export function crearServicioRequisitos({ bd, obtenerRequisitosActivos, describirUsuarios }: DependenciasRequisitos) {
  async function exigirFile(cliente: Cliente, id: number) {
    if (!(await buscarFile(cliente, id))) throw new ErrorNoEncontrado('El file no existe.');
  }

  async function armar(catalogo: RequisitoCatalogoFiles[], filas: RequisitoFileBd[]): Promise<RequisitoDelFile[]> {
    const porTipo = new Map(filas.map((f) => [f.requisitoTipoId, f]));
    const ids = [...new Set(filas.map((f) => f.registradoPor).filter((id): id is number => id !== null))];
    const usuarios = await describirUsuarios(ids);
    return catalogo.map((r) => {
      const f = porTipo.get(r.id);
      const quien = f?.registradoPor ?? null;
      return {
        codigo: r.codigo,
        nombre: r.nombre,
        descripcion: r.descripcion,
        anioFormacion: r.anioFormacion,
        nivel: r.nivel,
        obligatorio: r.obligatorio,
        estado: f?.estado ?? 'PENDIENTE',
        fecha: deFecha(f?.fecha ?? null),
        nroDocumento: f?.nroDocumento ?? null,
        observacion: f?.observacion ?? null,
        registradoPor: quien === null ? null : { id: quien, nombre: usuarios.get(quien)?.nombre ?? '' },
        actualizado: f?.updatedAt.toISOString() ?? null,
      };
    });
  }

  async function listar(fileId: number): Promise<RequisitoDelFile[]> {
    await exigirFile(bd, fileId);
    return armar(await obtenerRequisitosActivos(bd), await listarRequisitosDelFile(bd, fileId));
  }

  return {
    listar,

    /** Registra o actualiza uno (SDD S2.4 §2.1). Sin cambios reales: no escribe ni registra. */
    async registrar(fileId: number, codigo: string, datos: DatosRequisito): Promise<RequisitoDelFile> {
      const actual = (await listar(fileId)).find((r) => r.codigo === codigo);
      if (!actual) throw new ErrorNoEncontrado('Ese requisito no existe en el catálogo.');
      const antes: Record<string, unknown> = {};
      const despues: Record<string, unknown> = {};
      for (const c of CAMPOS) {
        if (actual[c] !== datos[c]) {
          antes[c] = actual[c];
          despues[c] = datos[c];
        }
      }
      if (Object.keys(despues).length === 0) return actual;

      return bd.$transaction(async (tx) => {
        const catalogo = await obtenerRequisitosActivos(tx);
        const tipo = catalogo.find((r) => r.codigo === codigo)!;
        await guardarRequisitoDelFile(tx, fileId, tipo.id, {
          estado: datos.estado,
          fecha: aFecha(datos.fecha),
          nroDocumento: datos.nroDocumento,
          observacion: datos.observacion,
          // Quien registró: el usuario de la sesión (lo dejó `autenticar` en el contexto).
          registradoPor: obtenerContexto()?.usuarioId ?? null,
        });
        // En el historial del file (S2.10): EDITAR del file con el código del requisito (§2.3).
        await registrarEvento(tx, {
          accion: 'EDITAR',
          modulo: 'FILES',
          entidad: 'file_academico',
          entidadId: fileId,
          antes: { requisito: codigo, ...antes },
          despues: { requisito: codigo, ...despues },
        });
        const filas = await listarRequisitosDelFile(tx, fileId);
        return (await armar(catalogo, filas)).find((r) => r.codigo === codigo)!;
      });
    },
  };
}

export type ServicioRequisitos = ReturnType<typeof crearServicioRequisitos>;
