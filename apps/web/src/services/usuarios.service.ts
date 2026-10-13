import type { Rol, Usuario } from '@/types';
import { auditar, copia, db } from '@/mocks/db';
import { ahora, delay } from '@/lib/formato';
import { ErrorNegocio } from '@/lib/transiciones';
import { LATENCIA } from './_comun';

export type EstadoUsuario = 'Activo' | 'Inactivo' | 'Bloqueado';
export interface FiltrosUsuarios {
  texto?: string;
  rol?: Rol | '';
  estado?: EstadoUsuario | '';
}
export type DatosUsuario = Pick<Usuario, 'usuario' | 'nombre' | 'correo' | 'rol' | 'sedeId'>;

export const estadoUsuario = (u: Usuario): EstadoUsuario =>
  !u.activo ? 'Inactivo' : u.bloqueadoHasta && u.bloqueadoHasta > ahora() ? 'Bloqueado' : 'Activo';

const buscar = (id: number): Usuario => {
  const u = db.usuarios.find((x) => x.id === id);
  if (!u) throw new ErrorNegocio('Usuario no encontrado');
  return u;
};

export const usuariosService = {
  async listar(f: FiltrosUsuarios = {}): Promise<Usuario[]> {
    await delay(LATENCIA);
    const t = f.texto?.toLowerCase().trim();
    return copia(
      db.usuarios.filter(
        (u) =>
          (!t || [u.usuario, u.nombre].some((v) => v.toLowerCase().includes(t))) &&
          (!f.rol || u.rol === f.rol) &&
          (!f.estado || estadoUsuario(u) === f.estado),
      ),
    );
  },

  /** RF-03: CI/usuario único. La contraseña inicial obliga a cambiarla en el primer ingreso. */
  async crear(d: DatosUsuario, actor: Usuario): Promise<Usuario> {
    await delay(LATENCIA);
    if (db.usuarios.some((u) => u.usuario === d.usuario.trim()))
      throw new ErrorNegocio('Ya existe un usuario con ese CI/usuario');
    const nuevo: Usuario = {
      ...d,
      usuario: d.usuario.trim(),
      id: Math.max(...db.usuarios.map((u) => u.id)) + 1,
      activo: true,
      debeCambiarClave: true,
    };
    db.usuarios.push(nuevo);
    auditar(actor.nombre, 'Usuarios', 'Crear usuario', nuevo.usuario, null, { ...d });
    return copia(nuevo);
  },

  async editar(id: number, d: DatosUsuario, actor: Usuario): Promise<Usuario> {
    await delay(LATENCIA);
    const u = buscar(id);
    if (db.usuarios.some((x) => x.usuario === d.usuario.trim() && x.id !== id))
      throw new ErrorNegocio('Ya existe un usuario con ese CI/usuario');
    const antes = { nombre: u.nombre, correo: u.correo, rol: u.rol, sedeId: u.sedeId };
    Object.assign(u, d);
    auditar(actor.nombre, 'Usuarios', 'Editar usuario', u.usuario, antes, { ...d });
    return copia(u);
  },

  /** RF-03 CA4: el reseteo obliga a cambiar la contraseña en el siguiente ingreso. */
  async resetearClave(id: number, actor: Usuario): Promise<void> {
    await delay(LATENCIA);
    const u = buscar(id);
    u.debeCambiarClave = true;
    u.bloqueadoHasta = undefined;
    db.intentos[u.usuario] = 0;
    auditar(
      actor.nombre,
      'Usuarios',
      'Resetear contraseña',
      u.usuario,
      { debeCambiarClave: false },
      { debeCambiarClave: true },
    );
  },

  /** RF-03 CA2: la baja es lógica, nunca DELETE. */
  async cambiarActivo(id: number, activo: boolean, actor: Usuario): Promise<void> {
    await delay(LATENCIA);
    const u = buscar(id);
    if (u.id === actor.id) throw new ErrorNegocio('No puedes darte de baja a ti mismo');
    u.activo = activo;
    auditar(
      actor.nombre,
      'Usuarios',
      activo ? 'Reactivar usuario' : 'Dar de baja usuario',
      u.usuario,
      { activo: !activo },
      { activo },
    );
  },
};
