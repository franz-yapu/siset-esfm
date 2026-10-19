import type { ClienteBd, TransaccionBd } from '@/compartido/bd';
import { ErrorConflicto, ErrorNegocio, ErrorNoEncontrado } from '@/compartido/errores';
import { registrarEvento } from '@/modulos/auditoria';
import {
  actualizarModalidad,
  buscarModalidad,
  buscarModalidadPorCodigo,
  insertarModalidad,
  obtenerTodasLasModalidades,
  requisitosQueLaNombran,
  ultimoOrdenModalidad,
  type ModalidadBd,
} from './modalidad.repositorio';
import type { CambiosModalidad, DatosCrearModalidad, ModalidadAdmin } from './modalidades-admin.esquemas';

const evento = (id: number) => ({ modulo: 'CATALOGOS' as const, entidad: 'modalidad_ingreso', entidadId: id });

/**
 * Modalidades de ingreso que administra Kardex (DEC-058). Dar de baja no borra: los files que la tienen la conservan
 * y deja de ofrecerse al registrar uno nuevo; los requisitos que la nombran la siguen guardando. Cada cambio deja su
 * evento en la bitácora (DEC-007).
 */
export function crearServicioModalidadesAdmin(bd: ClienteBd) {
  async function conConteo(cliente: ClienteBd | TransaccionBd, m: ModalidadBd): Promise<ModalidadAdmin> {
    return { ...m, requisitos: await requisitosQueLaNombran(cliente, m.codigo) };
  }

  async function cargar(cliente: ClienteBd | TransaccionBd, id: number) {
    const m = await buscarModalidad(cliente, id);
    if (!m) throw new ErrorNoEncontrado('La modalidad no existe.');
    return m;
  }

  async function cambiarActivo(id: number, activo: boolean): Promise<ModalidadAdmin> {
    return bd.$transaction(async (tx) => {
      const antes = await cargar(tx, id);
      if (antes.activo === activo) {
        throw new ErrorNegocio(
          activo ? 'La modalidad ya está activa.' : 'La modalidad ya está dada de baja.',
          'ESTADO_SIN_CAMBIO',
        );
      }
      await actualizarModalidad(tx, id, { activo });
      await registrarEvento(tx, {
        accion: activo ? 'REACTIVAR' : 'DAR_DE_BAJA',
        ...evento(id),
        antes: { activo: !activo },
        despues: { activo },
      });
      return conConteo(tx, await cargar(tx, id));
    });
  }

  return {
    async listar(): Promise<ModalidadAdmin[]> {
      return Promise.all((await obtenerTodasLasModalidades(bd)).map((m) => conConteo(bd, m)));
    },

    async crear({ codigo, ...datos }: DatosCrearModalidad): Promise<ModalidadAdmin> {
      return bd.$transaction(async (tx) => {
        if (await buscarModalidadPorCodigo(tx, codigo)) {
          throw new ErrorConflicto(`Ya existe la modalidad ${codigo}.`, undefined, 'MODALIDAD_EXISTENTE');
        }
        const { id } = await insertarModalidad(tx, codigo, { ...datos, orden: (await ultimoOrdenModalidad(tx)) + 1 });
        const creada = await cargar(tx, id);
        await registrarEvento(tx, { accion: 'CREAR', ...evento(id), despues: creada });
        return conConteo(tx, creada);
      });
    },

    async editar(id: number, cambios: CambiosModalidad): Promise<ModalidadAdmin> {
      return bd.$transaction(async (tx) => {
        const antes = await cargar(tx, id);
        await actualizarModalidad(tx, id, cambios);
        const despues = await cargar(tx, id);
        const campos = (['nombre', 'descripcion', 'orden'] as const).filter((k) => antes[k] !== despues[k]);
        if (campos.length > 0) {
          await registrarEvento(tx, {
            accion: 'EDITAR',
            ...evento(id),
            antes: Object.fromEntries(campos.map((k) => [k, antes[k]])),
            despues: Object.fromEntries(campos.map((k) => [k, despues[k]])),
          });
        }
        return conConteo(tx, despues);
      });
    },

    darDeBaja: (id: number) => cambiarActivo(id, false),
    reactivar: (id: number) => cambiarActivo(id, true),
  };
}
