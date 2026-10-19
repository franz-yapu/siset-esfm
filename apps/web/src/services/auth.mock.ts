import type { Usuario } from '@/types';
import { auditar, copia, db } from '@/mocks/db';
import { CLAVE_DEMO } from '@/mocks/usuarios';
import { ahora, aIso, delay } from '@/lib/formato';
import { ErrorApi } from '@/lib/errores';
import { validarClave } from '@/lib/reglas';
import { LATENCIA } from './_comun';

const MAX_INTENTOS = 5;

/** La "cookie" de la demo: el id de la sesión simulada, solo en esta pestaña (SDD S1.10 §2.2). */
const CLAVE_SESION = 'siset.sesion';

const leerSesion = (): number | null => {
  try {
    const v = sessionStorage.getItem(CLAVE_SESION);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
};

const guardarSesion = (id: number | null): void => {
  try {
    if (id === null) sessionStorage.removeItem(CLAVE_SESION);
    else sessionStorage.setItem(CLAVE_SESION, String(id));
  } catch {
    /* sin sessionStorage: la sesión dura lo que la página */
  }
};

const activo = (id: number): Usuario | null => {
  const u = db.usuarios.find((x) => x.id === id && x.activo);
  return u ? copia(u) : null;
};

/** Mismo 401 que la API en todos los casos: nunca revela si la cuenta existe o está bloqueada (DEC-012, DEC-021). */
const credencialesInvalidas = () => new ErrorApi('CI o contraseña incorrectos.', 'CREDENCIALES_INVALIDAS', 401);
/** Contraseñas cambiadas durante la demo (en memoria). */
const claves: Record<string, string> = {};

export const authMock = {
  /** RF-01: CI o usuario + contraseña; 5 intentos fallidos bloquean 15 min (sin decirlo, como la API). */
  async login(usuario: string, password: string): Promise<Usuario> {
    await delay(LATENCIA);
    const u = db.usuarios.find((x) => x.usuario === usuario.trim());
    if (u?.bloqueadoHasta && u.bloqueadoHasta > ahora()) throw credencialesInvalidas();
    if (!u || !u.activo || password !== (claves[u.usuario] ?? CLAVE_DEMO)) {
      if (u) {
        db.intentos[u.usuario] = (db.intentos[u.usuario] ?? 0) + 1;
        if (db.intentos[u.usuario] >= MAX_INTENTOS) {
          u.bloqueadoHasta = aIso(new Date(Date.now() + 15 * 60_000));
          db.intentos[u.usuario] = 0;
          auditar(u.nombre, 'Seguridad', 'Cuenta bloqueada por 5 intentos fallidos', u.usuario);
          throw credencialesInvalidas();
        }
        auditar(u.nombre, 'Seguridad', 'Inicio de sesión fallido', u.usuario);
      }
      throw credencialesInvalidas();
    }
    db.intentos[u.usuario] = 0;
    u.ultimoAcceso = ahora();
    auditar(u.nombre, 'Seguridad', 'Inicio de sesión', u.usuario);
    guardarSesion(u.id);
    return copia(u);
  },

  /** Cierra la sesión simulada. Sin usuario (al arrancar tras inactividad) no hay a quién auditar. */
  async logout(u: Usuario | null): Promise<void> {
    const id = u?.id ?? leerSesion();
    const real = id === null ? null : activo(id);
    if (real) auditar(real.nombre, 'Seguridad', 'Cierre de sesión', real.usuario);
    guardarSesion(null);
  },

  /** Como el refresh de la API: el usuario de la sesión simulada con sus datos al día, o null. */
  async restaurar(): Promise<Usuario | null> {
    const id = leerSesion();
    const u = id === null ? null : activo(id);
    if (!u) guardarSesion(null);
    return u;
  },

  /** Selector "Ver como" (solo demo): pasa la sesión simulada a otro usuario. */
  async verComo(id: number): Promise<Usuario | null> {
    const u = activo(id);
    if (u) guardarSesion(u.id);
    return u;
  },

  /** Mismos errores que POST /auth/cambiar-password (SDD S1.9 §2.3); devuelve el usuario sin la obligación. */
  async cambiarPassword(u: Usuario, passwordActual: string, passwordNueva: string): Promise<Usuario> {
    await delay(LATENCIA);
    // Mismo orden que la API: primero la política (la ruta valida), luego la actual, luego la igualdad.
    const invalida = (mensaje: string) =>
      new ErrorApi('Los datos enviados no son válidos.', 'VALIDACION', 400, [{ ruta: 'body.passwordNueva', mensaje }]);
    const error = validarClave(passwordNueva);
    if (error) throw invalida(error);
    if (passwordActual !== (claves[u.usuario] ?? CLAVE_DEMO)) {
      throw new ErrorApi('La contraseña actual no es correcta.', 'PASSWORD_ACTUAL_INCORRECTA', 422);
    }
    if (passwordNueva === passwordActual) throw invalida('La nueva contraseña debe ser distinta de la actual');
    claves[u.usuario] = passwordNueva;
    const real = db.usuarios.find((x) => x.id === u.id);
    if (!real) throw new ErrorApi('Necesita iniciar sesión.', 'NO_AUTENTICADO', 401);
    real.debeCambiarClave = false;
    auditar(u.nombre, 'Seguridad', 'Cambio de contraseña', u.usuario);
    return copia(real);
  },

  /** Solo para la demo: usuarios de la tabla de la sección 2 y selector "Ver como". */
  usuariosDemo(): Usuario[] {
    const demo = ['7012345', 'secdir', 'seccoord', 'coordinador', 'kardex', 'admin'];
    return demo
      .map((d) => db.usuarios.find((u) => u.usuario === d))
      .filter((u): u is Usuario => Boolean(u))
      .map(copia);
  },
};
