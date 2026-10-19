import type { ClienteBd, TransaccionBd } from '@/compartido/bd';
import { ErrorNegocio, ErrorNoEncontrado } from '@/compartido/errores';
import { registrarEvento } from '@/modulos/auditoria';
import {
  actualizarRequisito,
  buscarRequisito,
  codigosQueEmpiezanCon,
  insertarRequisito,
  obtenerTodosLosRequisitos,
  ultimoOrden,
  type RequisitoAdminBd,
} from './requisito.repositorio';
import { obtenerModalidadesActivas } from './modalidad.repositorio';
import type { CambiosRequisito, DatosCrearRequisito, RequisitoAdmin } from './requisitos-admin.esquemas';

const aLista = (s: string | null): string[] => (s ? s.split(',') : []);

/**
 * ['B3', 'B1'] → "B1,B3", en el orden del catálogo. Cada código tiene que ser de una modalidad activa (DEC-058).
 * Ninguna, o todas las activas, se guarda como null: el requisito se pide a todas, también a las que se creen después
 * (ADR-0007).
 */
async function aTexto(tx: TransaccionBd, m: readonly string[] | null): Promise<string | null> {
  if (!m || m.length === 0) return null;
  const activas = (await obtenerModalidadesActivas(tx)).map((x) => x.codigo);
  const desconocidas = m.filter((c) => !activas.includes(c));
  if (desconocidas.length > 0) {
    throw new ErrorNegocio(
      `La modalidad ${desconocidas.join(', ')} no existe o está dada de baja.`,
      'MODALIDAD_INEXISTENTE',
    );
  }
  const unicas = activas.filter((c) => m.includes(c));
  return unicas.length === activas.length ? null : unicas.join(',');
}

const aApi = ({ soloModalidad, ...r }: RequisitoAdminBd): RequisitoAdmin => ({
  ...r,
  modalidades: aLista(soloModalidad),
});

/** Lo que guarda la bitácora: sin el id ni el código, que no cambian. */
const paraBitacora = ({ id: _id, codigo: _codigo, ...r }: RequisitoAdmin) => r;

/** Código a partir del nombre: mayúsculas sin tildes, con sufijo si ya existe (máx. 30, el largo de la columna). */
export function codigoDesdeNombre(nombre: string, existentes: readonly string[]): string {
  const base =
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 26)
      .replace(/_+$/, '') || 'REQUISITO';
  if (!existentes.includes(base)) return base;
  for (let i = 2; ; i++) if (!existentes.includes(`${base}_${i}`)) return `${base}_${i}`;
}

/**
 * Catálogo de requisitos editable por Kardex (DEC-055). Dar de baja nunca borra: lo ya registrado en los files se
 * conserva y el requisito deja de pedirse y de contar para el semáforo. Cada cambio deja su evento (DEC-007).
 */
export function crearServicioRequisitosAdmin(bd: ClienteBd) {
  async function cargar(cliente: Parameters<typeof buscarRequisito>[0], id: number) {
    const r = await buscarRequisito(cliente, id);
    if (!r) throw new ErrorNoEncontrado('El requisito no existe.');
    return aApi(r);
  }

  async function cambiarActivo(id: number, activo: boolean): Promise<RequisitoAdmin> {
    return bd.$transaction(async (tx) => {
      const antes = await cargar(tx, id);
      if (antes.activo === activo) {
        throw new ErrorNegocio(
          activo ? 'El requisito ya está activo.' : 'El requisito ya está dado de baja.',
          'ESTADO_SIN_CAMBIO',
        );
      }
      await actualizarRequisito(tx, id, { activo });
      await registrarEvento(tx, {
        accion: activo ? 'REACTIVAR' : 'DAR_DE_BAJA',
        modulo: 'CATALOGOS',
        entidad: 'requisito_tipo',
        entidadId: id,
        antes: { activo: !activo },
        despues: { activo },
      });
      return cargar(tx, id);
    });
  }

  return {
    async listar(): Promise<RequisitoAdmin[]> {
      return (await obtenerTodosLosRequisitos(bd)).map(aApi);
    },

    async crear({ modalidades, ...datos }: DatosCrearRequisito): Promise<RequisitoAdmin> {
      return bd.$transaction(async (tx) => {
        const base = codigoDesdeNombre(datos.nombre, []);
        const codigo = codigoDesdeNombre(datos.nombre, await codigosQueEmpiezanCon(tx, base));
        const { id } = await insertarRequisito(tx, codigo, {
          ...datos,
          soloModalidad: await aTexto(tx, modalidades),
          orden: (await ultimoOrden(tx)) + 1,
        });
        const creado = await cargar(tx, id);
        await registrarEvento(tx, {
          accion: 'CREAR',
          modulo: 'CATALOGOS',
          entidad: 'requisito_tipo',
          entidadId: id,
          despues: { codigo, ...paraBitacora(creado) },
        });
        return creado;
      });
    },

    async editar(id: number, { modalidades, ...cambios }: CambiosRequisito): Promise<RequisitoAdmin> {
      return bd.$transaction(async (tx) => {
        const antes = await cargar(tx, id);
        await actualizarRequisito(tx, id, {
          ...cambios,
          ...(modalidades !== undefined && { soloModalidad: await aTexto(tx, modalidades) }),
        });
        const despues = await cargar(tx, id);
        const a = paraBitacora(antes) as Record<string, unknown>;
        const d = paraBitacora(despues) as Record<string, unknown>;
        const campos = Object.keys(d).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(d[k]));
        if (campos.length > 0) {
          await registrarEvento(tx, {
            accion: 'EDITAR',
            modulo: 'CATALOGOS',
            entidad: 'requisito_tipo',
            entidadId: id,
            antes: Object.fromEntries(campos.map((k) => [k, a[k]])),
            despues: Object.fromEntries(campos.map((k) => [k, d[k]])),
          });
        }
        return despues;
      });
    },

    darDeBaja: (id: number) => cambiarActivo(id, false),
    reactivar: (id: number) => cambiarActivo(id, true),
  };
}
