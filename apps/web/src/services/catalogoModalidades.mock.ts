import type { Usuario } from '@/types';
import type { ModalidadAdmin, ModalidadIngreso } from '@/types/catalogo-requisitos';
import { auditar, copia, db } from '@/mocks/db';
import { delay } from '@/lib/formato';
import { ErrorApi } from '@/lib/errores';
import { validarModalidad } from '@/lib/catalogo-requisitos';
import { LATENCIA } from './_comun';
import type { ServicioCatalogoModalidades } from './catalogoModalidades.service';

const MODULO = 'Catálogos';

const buscar = (id: number): ModalidadIngreso => {
  const m = db.modalidades.find((x) => x.id === id);
  if (!m) throw new ErrorApi('La modalidad no existe.', 'NO_ENCONTRADO', 404);
  return m;
};

/** Como la API: cuántos requisitos activos la nombran en su lista. */
const conConteo = (m: ModalidadIngreso): ModalidadAdmin => ({
  ...m,
  requisitos: db.requisitos.filter((r) => r.activo && r.modalidades.includes(m.codigo)).length,
});

const ordenadas = () => [...db.modalidades].sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));

function cambiarActivo(id: number, activo: boolean, actor: Usuario): ModalidadAdmin {
  const m = buscar(id);
  if (m.activo === activo) {
    throw new ErrorApi(
      activo ? 'La modalidad ya está activa.' : 'La modalidad ya está dada de baja.',
      'ESTADO_SIN_CAMBIO',
      422,
    );
  }
  m.activo = activo;
  auditar(actor.nombre, MODULO, activo ? 'Reactivar modalidad' : 'Dar de baja modalidad', m.codigo);
  return copia(conConteo(m));
}

/** El catálogo de modalidades de la demo (DEC-058). */
export const catalogoModalidadesMock: ServicioCatalogoModalidades = {
  async activas() {
    await delay(LATENCIA);
    return copia(ordenadas().filter((m) => m.activo));
  },

  async listar() {
    await delay(LATENCIA);
    return copia(ordenadas().map(conConteo));
  },

  async crear(d, actor) {
    await delay(LATENCIA);
    const codigo = d.codigo.trim().toUpperCase();
    const errores = Object.entries(validarModalidad({ codigo, nombre: d.nombre }));
    if (errores.length) {
      throw new ErrorApi(
        'Los datos enviados no son válidos.',
        'VALIDACION',
        400,
        errores.map(([campo, mensaje]) => ({ ruta: `body.${campo}`, mensaje })),
      );
    }
    if (db.modalidades.some((m) => m.codigo === codigo))
      throw new ErrorApi(`Ya existe la modalidad ${codigo}.`, 'MODALIDAD_EXISTENTE', 409);
    const nueva: ModalidadIngreso = {
      id: Math.max(0, ...db.modalidades.map((m) => m.id)) + 1,
      codigo,
      nombre: d.nombre.trim(),
      descripcion: d.descripcion?.trim() || null,
      orden: Math.max(0, ...db.modalidades.map((m) => m.orden)) + 1,
      activo: true,
    };
    db.modalidades.push(nueva);
    auditar(actor.nombre, MODULO, 'Agregar modalidad', codigo, null, { nombre: nueva.nombre });
    return copia(conConteo(nueva));
  },

  async editar(id, c, actor) {
    await delay(LATENCIA);
    const m = buscar(id);
    const antes = { ...m };
    Object.assign(m, {
      ...c,
      ...(c.nombre !== undefined && { nombre: c.nombre.trim() }),
      ...(c.descripcion !== undefined && { descripcion: c.descripcion?.trim() || null }),
    });
    auditar(actor.nombre, MODULO, 'Editar modalidad', m.codigo, antes, { ...m });
    return copia(conConteo(m));
  },

  async darDeBaja(id, actor) {
    await delay(LATENCIA);
    return cambiarActivo(id, false, actor);
  },

  async reactivar(id, actor) {
    await delay(LATENCIA);
    return cambiarActivo(id, true, actor);
  },
};
