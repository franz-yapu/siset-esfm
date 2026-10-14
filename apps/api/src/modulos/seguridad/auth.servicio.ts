import { randomBytes } from 'node:crypto';
import type { ClienteBd, TransaccionBd } from '@/compartido/bd';
import { ErrorNegocio, ErrorNoAutenticado, ErrorValidacion } from '@/compartido/errores';
import { obtenerContexto } from '@/compartido/http';
import type { RespuestaLogin, UsuarioSesion } from './auth.esquemas';
import {
  registrarBloqueo,
  registrarCambioPassword,
  registrarLogin,
  registrarLoginCiInexistente,
  registrarLoginFallido,
  registrarLogout,
  registrarReusoSesion,
  type MotivoLoginFallido,
} from './eventos-acceso';
import { firmarAccessToken } from './jwt';
import { compararPassword, hashPassword } from './password';
import {
  buscarRefreshTokenPorHash,
  crearRefreshToken,
  revocarRefreshToken,
  revocarRefreshTokensDeUsuario,
} from './refresh-token.repositorio';
import { hashDeToken } from './token';
import {
  actualizarPassword,
  bloquearCuenta,
  buscarUsuarioParaLogin,
  buscarUsuarioPorId,
  registrarAcceso,
  sumarIntentoFallido,
  type UsuarioBd,
} from './usuario.repositorio';

/** Refresh token: 8 h desde el login; la rotación (S1.5) no lo extiende (DEC-012). */
export const DURACION_REFRESH_MS = 8 * 60 * 60_000;

export type NombreDe = (cliente: ClienteBd | TransaccionBd, personaId: number) => Promise<string>;

type ParametroLogin = 'MAX_INTENTOS_LOGIN' | 'MIN_BLOQUEO_LOGIN';
export type LeerParametros = (
  cliente: ClienteBd | TransaccionBd,
  claves: readonly ParametroLogin[],
) => Promise<Record<ParametroLogin, number>>;

export interface DependenciasAuth {
  bd: ClienteBd;
  jwtSecreto: string;
  /** Del módulo personas; lo inyecta la raíz de composición (ADR-0001). */
  nombreDe: NombreDe;
  /** Del módulo catalogos (`leerParametrosEnteros`); lo inyecta la raíz de composición. */
  leerParametros: LeerParametros;
  ahora?: () => Date;
}

export interface ResultadoLogin extends RespuestaLogin {
  refreshToken: string;
  refreshExpiraEn: Date;
}

/** Refresh ausente, inexistente, vencido, reusado o de un usuario inactivo (SDD S1.5 §2.1). */
export const CODIGO_SESION_INVALIDA = 'SESION_INVALIDA';
const sesionInvalida = () =>
  new ErrorNoAutenticado('Su sesión terminó. Vuelva a iniciar sesión.', CODIGO_SESION_INVALIDA);

/** El mismo error para CI inexistente, contraseña incorrecta, cuenta inactiva o bloqueada (SDD S1.3 §2.2). */
const credencialesInvalidas = () => new ErrorNoAutenticado('CI o contraseña incorrectos.', 'CREDENCIALES_INVALIDAS');

export function crearServicioAuth({
  bd,
  jwtSecreto,
  nombreDe,
  leerParametros,
  ahora = () => new Date(),
}: DependenciasAuth) {
  // Hash de un texto aleatorio: con un CI inexistente igual se compara, para tardar lo mismo.
  // Se calcula la primera vez que hace falta, no al crear la app.
  let hashFicticio: Promise<string> | undefined;
  const ficticio = () => (hashFicticio ??= hashPassword(randomBytes(32).toString('hex')));

  async function login(usuario: string, password: string): Promise<ResultadoLogin> {
    const u = await buscarUsuarioParaLogin(bd, usuario);
    if (!u) {
      await compararPassword(password, await ficticio());
      await registrarLoginCiInexistente(bd, usuario); // D-26 (S1.3b)
      throw credencialesInvalidas();
    }

    // La contraseña se compara siempre primero: el tiempo no revela el estado de la cuenta.
    const momento = ahora();
    const correcta = await compararPassword(password, u.passwordHash);
    const bloqueada = u.bloqueadoHasta !== null && u.bloqueadoHasta > momento;

    if (!correcta) {
      await registrarPasswordIncorrecta(u.id, u.intentosFallidos, bloqueada, momento);
      throw credencialesInvalidas();
    }
    const motivo: MotivoLoginFallido | null = !u.activo ? 'CUENTA_INACTIVA' : bloqueada ? 'CUENTA_BLOQUEADA' : null;
    if (motivo) {
      await registrarLoginFallido(bd, u.id, motivo, u.intentosFallidos);
      throw credencialesInvalidas();
    }

    return bd.$transaction(async (tx) => {
      const sesion = await emitirSesion(tx, u, momento, new Date(momento.getTime() + DURACION_REFRESH_MS));
      await registrarAcceso(tx, u.id, momento);
      await registrarLogin(tx, u.id);
      return sesion;
    });
  }

  /**
   * Crea la fila del refresh y firma el access, dentro de la transacción del caso de
   * uso. Rol, sede y `cpw` salen de la base, nunca de un token anterior (SDD S1.5 §2.2).
   */
  async function emitirSesion(
    tx: TransaccionBd,
    u: UsuarioBd,
    momento: Date,
    refreshExpiraEn: Date,
  ): Promise<ResultadoLogin> {
    const { token: accessToken, expiraEn } = await firmarAccessToken(
      { usuarioId: u.id, rol: u.rol.codigo, sedeId: u.sedeId, debeCambiarPassword: u.debeCambiarPassword },
      jwtSecreto,
      momento,
    );
    const refreshToken = randomBytes(32).toString('base64url');
    const contexto = obtenerContexto();
    await crearRefreshToken(tx, {
      usuarioId: u.id,
      tokenHash: hashDeToken(refreshToken),
      expiraEn: refreshExpiraEn,
      ip: contexto?.ip ?? null,
      userAgent: contexto?.userAgent ?? null,
    });
    return {
      accessToken,
      expiraEn: expiraEn.toISOString(),
      refreshToken,
      refreshExpiraEn,
      usuario: await usuarioSesion(tx, u),
    };
  }

  const usuarioSesion = async (cliente: TransaccionBd, u: UsuarioBd): Promise<UsuarioSesion> => ({
    id: u.id,
    usuario: u.username,
    nombre: await nombreDe(cliente, u.personaId),
    rol: u.rol.codigo,
    sedeId: u.sedeId,
    activo: u.activo,
    debeCambiarPassword: u.debeCambiarPassword,
    ultimoAcceso: u.ultimoAcceso?.toISOString() ?? null,
  });

  /** Reuso de un refresh ya rotado: se revocan todas las sesiones del usuario (SDD S1.5 §2.2). */
  async function revocarPorReuso(usuarioId: number, momento: Date): Promise<never> {
    await bd.$transaction(async (tx) => {
      const n = await revocarRefreshTokensDeUsuario(tx, usuarioId, momento);
      await registrarReusoSesion(tx, usuarioId, n);
    });
    throw sesionInvalida();
  }

  /** Rota el refresh: revoca el viejo y emite uno nuevo con el MISMO vencimiento (DEC-012). */
  async function refrescar(token: string | undefined): Promise<ResultadoLogin> {
    if (!token) throw sesionInvalida();
    const momento = ahora();
    const fila = await buscarRefreshTokenPorHash(bd, hashDeToken(token));
    if (!fila) throw sesionInvalida();
    if (fila.revocadoEn) return revocarPorReuso(fila.usuarioId, momento);
    if (fila.expiraEn <= momento) throw sesionInvalida();

    const u = await buscarUsuarioPorId(bd, fila.usuarioId);
    if (!u?.activo) {
      // Dado de baja: pierde todas sus sesiones. Bloqueado por intentos: sigue (SDD S1.5 §2.2).
      await revocarRefreshTokensDeUsuario(bd, fila.usuarioId, momento);
      throw sesionInvalida();
    }

    const sesion = await bd.$transaction(async (tx) => {
      // Atómico: si otra petición lo revocó antes, esto es un reuso.
      if (!(await revocarRefreshToken(tx, fila.id, momento))) return null;
      return emitirSesion(tx, u, momento, fila.expiraEn);
    });
    return sesion ?? revocarPorReuso(fila.usuarioId, momento);
  }

  /** Revoca la sesión de la cookie si sigue activa y registra LOGOUT. Nunca falla (SDD S1.5 §2.3). */
  async function cerrarSesion(token: string | undefined): Promise<void> {
    if (!token) return;
    const fila = await buscarRefreshTokenPorHash(bd, hashDeToken(token));
    if (!fila || fila.revocadoEn || fila.expiraEn <= ahora()) return;
    await bd.$transaction(async (tx) => {
      if (await revocarRefreshToken(tx, fila.id, ahora())) await registrarLogout(tx, fila.usuarioId);
    });
  }

  /**
   * Cambia la contraseña de quien tiene la sesión: revoca TODAS sus sesiones y emite
   * una nueva con `cpw: false` (SDD S1.5 §2.3). La política ya la validó la ruta.
   */
  async function cambiarPassword(usuarioId: number, actual: string, nueva: string): Promise<ResultadoLogin> {
    const u = await buscarUsuarioPorId(bd, usuarioId);
    if (!u?.activo) throw new ErrorNoAutenticado();
    if (!(await compararPassword(actual, u.passwordHash))) {
      throw new ErrorNegocio('La contraseña actual no es correcta.', 'PASSWORD_ACTUAL_INCORRECTA');
    }
    if (nueva === actual) {
      throw new ErrorValidacion([
        { ruta: 'body.passwordNueva', mensaje: 'La nueva contraseña debe ser distinta de la actual' },
      ]);
    }
    const hash = await hashPassword(nueva);
    const momento = ahora();
    return bd.$transaction(async (tx) => {
      await actualizarPassword(tx, u.id, hash);
      await revocarRefreshTokensDeUsuario(tx, u.id, momento);
      const sesion = await emitirSesion(
        tx,
        { ...u, debeCambiarPassword: false },
        momento,
        new Date(momento.getTime() + DURACION_REFRESH_MS),
      );
      await registrarCambioPassword(tx, u.id);
      return sesion;
    });
  }

  /**
   * Contador de intentos (SDD S1.4 §2.1): +1 atómico y, al llegar al máximo, bloqueo con
   * el contador en 0. Con la cuenta ya bloqueada no se cuenta ni se extiende el bloqueo.
   */
  async function registrarPasswordIncorrecta(id: number, intentosActuales: number, bloqueada: boolean, momento: Date) {
    if (bloqueada) {
      await registrarLoginFallido(bd, id, 'PASSWORD_INCORRECTA', intentosActuales);
      return;
    }
    const parametros = await leerParametros(bd, ['MAX_INTENTOS_LOGIN', 'MIN_BLOQUEO_LOGIN']);
    await bd.$transaction(async (tx) => {
      const intentos = await sumarIntentoFallido(tx, id);
      await registrarLoginFallido(tx, id, 'PASSWORD_INCORRECTA', intentos);
      if (intentos >= parametros.MAX_INTENTOS_LOGIN) {
        const hasta = new Date(momento.getTime() + parametros.MIN_BLOQUEO_LOGIN * 60_000);
        await bloquearCuenta(tx, id, hasta);
        await registrarBloqueo(tx, id, hasta);
      }
    });
  }

  return { login, refrescar, cerrarSesion, cambiarPassword };
}

export type ServicioAuth = ReturnType<typeof crearServicioAuth>;
