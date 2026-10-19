import type { Usuario } from '@/types';
import type { RequisitoAdmin } from '@/types/catalogo-requisitos';
import { MODALIDADES, type Modalidad } from '@/types/files';
import { auditar, copia, db } from '@/mocks/db';
import { delay } from '@/lib/formato';
import { ErrorApi } from '@/lib/errores';
import { codigoDesdeNombre, validarRequisitoCatalogo } from '@/lib/catalogo-requisitos';
import { LATENCIA } from './_comun';
import type { ServicioCatalogoRequisitos } from './catalogoRequisitos.service';

const MODULO = 'Catálogos';

const buscar = (id: number): RequisitoAdmin => {
  const r = db.requisitos.find((x) => x.id === id);
  if (!r) throw new ErrorApi('El requisito no existe.', 'NO_ENCONTRADO', 404);
  return r;
};

/** Como la API: todas o ninguna = todas (lista vacía), en el orden A, B1, B2, B3. */
const normalizar = (m: readonly Modalidad[]): Modalidad[] => {
  const unicas = MODALIDADES.filter((x) => m.includes(x));
  return unicas.length === MODALIDADES.length ? [] : unicas;
};

const exigirValido = (nombre: string): void => {
  const error = validarRequisitoCatalogo({ nombre });
  if (error.nombre) {
    throw new ErrorApi('Los datos enviados no son válidos.', 'VALIDACION', 400, [
      { ruta: 'body.nombre', mensaje: error.nombre },
    ]);
  }
};

function cambiarActivo(id: number, activo: boolean, actor: Usuario): RequisitoAdmin {
  const r = buscar(id);
  if (r.activo === activo) {
    throw new ErrorApi(
      activo ? 'El requisito ya está activo.' : 'El requisito ya está dado de baja.',
      'ESTADO_SIN_CAMBIO',
      422,
    );
  }
  r.activo = activo;
  auditar(actor.nombre, MODULO, activo ? 'Reactivar requisito' : 'Dar de baja requisito', r.codigo);
  return copia(r);
}

/** El catálogo de la demo (DEC-055): lo que Kardex cambia aquí lo usan los requisitos y el semáforo del mock. */
export const catalogoRequisitosMock: ServicioCatalogoRequisitos = {
  async listar() {
    await delay(LATENCIA);
    return copia([...db.requisitos].sort((a, b) => a.orden - b.orden));
  },

  async crear(d, actor) {
    await delay(LATENCIA);
    exigirValido(d.nombre);
    const nuevo: RequisitoAdmin = {
      ...d,
      nombre: d.nombre.trim(),
      descripcion: d.descripcion?.trim() || null,
      modalidades: normalizar(d.modalidades),
      id: Math.max(0, ...db.requisitos.map((r) => r.id)) + 1,
      codigo: codigoDesdeNombre(
        d.nombre,
        db.requisitos.map((r) => r.codigo),
      ),
      orden: Math.max(0, ...db.requisitos.map((r) => r.orden)) + 1,
      activo: true,
    };
    db.requisitos.push(nuevo);
    auditar(actor.nombre, MODULO, 'Agregar requisito', nuevo.codigo, null, { nombre: nuevo.nombre });
    return copia(nuevo);
  },

  async editar(id, c, actor) {
    await delay(LATENCIA);
    const r = buscar(id);
    if (c.nombre !== undefined) exigirValido(c.nombre);
    const antes = copia(r);
    Object.assign(r, {
      ...c,
      ...(c.nombre !== undefined && { nombre: c.nombre.trim() }),
      ...(c.modalidades !== undefined && { modalidades: normalizar(c.modalidades) }),
    });
    auditar(actor.nombre, MODULO, 'Editar requisito', r.codigo, { ...antes }, { ...r });
    return copia(r);
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
