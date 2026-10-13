import type { Usuario } from '@/types';
import { auditar, copia, db } from '@/mocks/db';
import { CLAVE_DEMO } from '@/mocks/usuarios';
import { ahora, aIso, delay } from '@/lib/formato';
import { ErrorNegocio } from '@/lib/transiciones';
import { validarClave } from '@/lib/reglas';
import { LATENCIA } from './_comun';

const MAX_INTENTOS = 5;
/** Contraseñas cambiadas durante la demo (en memoria). */
const claves: Record<string, string> = {};

export const authMock = {
  /** RF-01: CI o usuario + contraseña; 5 intentos fallidos bloquean 15 min. */
  async login(usuario: string, clave: string): Promise<Usuario> {
    await delay(LATENCIA);
    const u = db.usuarios.find((x) => x.usuario === usuario.trim());
    if (u?.bloqueadoHasta && u.bloqueadoHasta > ahora()) throw new ErrorNegocio('Cuenta bloqueada por 15 minutos');
    if (!u || !u.activo || clave !== (claves[u.usuario] ?? CLAVE_DEMO)) {
      if (u) {
        db.intentos[u.usuario] = (db.intentos[u.usuario] ?? 0) + 1;
        if (db.intentos[u.usuario] >= MAX_INTENTOS) {
          u.bloqueadoHasta = aIso(new Date(Date.now() + 15 * 60_000));
          db.intentos[u.usuario] = 0;
          auditar(u.nombre, 'Seguridad', 'Cuenta bloqueada por 5 intentos fallidos', u.usuario);
          throw new ErrorNegocio('Cuenta bloqueada por 15 minutos');
        }
        auditar(u.nombre, 'Seguridad', 'Inicio de sesión fallido', u.usuario);
      }
      throw new ErrorNegocio('CI o contraseña incorrectos');
    }
    db.intentos[u.usuario] = 0;
    u.ultimoAcceso = ahora();
    auditar(u.nombre, 'Seguridad', 'Inicio de sesión', u.usuario);
    return copia(u);
  },

  async logout(u: Usuario): Promise<void> {
    auditar(u.nombre, 'Seguridad', 'Cierre de sesión', u.usuario);
  },

  /** Recupera el usuario de la sesión guardada (refresca datos como debeCambiarClave). */
  async obtener(id: number): Promise<Usuario | null> {
    const u = db.usuarios.find((x) => x.id === id && x.activo);
    return u ? copia(u) : null;
  },

  async cambiarClave(u: Usuario, nueva: string): Promise<void> {
    await delay(LATENCIA);
    const error = validarClave(nueva);
    if (error) throw new ErrorNegocio(error);
    claves[u.usuario] = nueva;
    const real = db.usuarios.find((x) => x.id === u.id);
    if (real) real.debeCambiarClave = false;
    auditar(u.nombre, 'Seguridad', 'Cambio de contraseña', u.usuario);
  },

  /** Solo para la demo: usuarios de la tabla de la sección 2 y selector "Ver como". */
  usuariosDemo(): Usuario[] {
    const demo = ['7012345', '6098765', 'secdir', 'seccoord', 'coordinador', 'kardex'];
    return demo
      .map((d) => db.usuarios.find((u) => u.usuario === d))
      .filter((u): u is Usuario => Boolean(u))
      .map(copia);
  },
};
