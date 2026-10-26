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
  registrarLoginSinCaptcha,
  registrarLoginFallido,
  registrarLogout,
  registrarReusoSesion,
  type MotivoLoginFallido,
} from './eventos-acceso';
import { firmarAccessToken } from './jwt';
import { compararPassword, hashPassword } from './password';
import {
  buscarRefreshTokenPorHash,
  buscarRefreshTokenPorId,
  crearRefreshToken,
  marcarReemplazo,
  revocarRefreshToken,
  revocarRefreshTokensDeUsuario,
  type RefreshTokenBd,
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

type ParametroAuth = 'MAX_INTENTOS_LOGIN' | 'MIN_BLOQUEO_LOGIN' | 'SEG_GRACIA_REFRESH';
export type LeerParametros = <C extends ParametroAuth>(
  cliente: ClienteBd | TransaccionBd,
  claves: readonly C[],
) => Promise<Record<C, number>>;

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
      const { sesion } = await emitirSesion(tx, u, momento, new Date(momento.getTime() + DURACION_REFRESH_MS));
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
  ): Promise<{ sesion: ResultadoLogin; refreshId: number }> {
    const { token: accessToken, expiraEn } = await firmarAccessToken(
      { usuarioId: u.id, rol: u.rol.codigo, sedeId: u.sedeId, debeCambiarPassword: u.debeCambiarPassword },
      jwtSecreto,
      momento,
    );
    const refreshToken = randomBytes(32).toString('base64url');
    const contexto = obtenerContexto();
    const { id: refreshId } = await crearRefreshToken(tx, {
      usuarioId: u.id,
      tokenHash: hashDeToken(refreshToken),
      expiraEn: refreshExpiraEn,
      ip: contexto?.ip ?? null,
      userAgent: contexto?.userAgent ?? null,
    });
    const sesion: ResultadoLogin = {
      accessToken,
      expiraEn: expiraEn.toISOString(),
      refreshToken,
      refreshExpiraEn,
      usuario: await usuarioSesion(tx, u),
    };
    return { sesion, refreshId };
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

  /** El dueño del refresh, si sigue activo. Dado de baja: pierde todas sus sesiones (SDD S1.5 §2.2). */
  async function usuarioActivo(usuarioId: number, momento: Date): Promise<UsuarioBd> {
    const u = await buscarUsuarioPorId(bd, usuarioId);
    if (!u?.activo) {
      // Bloqueado por intentos: sigue (SDD S1.5 §2.2).
      await revocarRefreshTokensDeUsuario(bd, usuarioId, momento);
      throw sesionInvalida();
    }
    return u;
  }

  /**
   * Revoca `revocar` (atómico), emite un refresh nuevo con el vencimiento de `fila` y deja a `apuntar`
   * apuntando al nuevo. Devuelve null si otra petición revocó `revocar` antes.
   */
  const rotar = (u: UsuarioBd, fila: RefreshTokenBd, revocar: number, apuntar: number[], momento: Date) =>
    bd.$transaction(async (tx) => {
      if (!(await revocarRefreshToken(tx, revocar, momento))) return null;
      const { sesion, refreshId } = await emitirSesion(tx, u, momento, fila.expiraEn);
      await marcarReemplazo(tx, apuntar, refreshId);
      return sesion;
    });

  /** Máximo de eslabones que se siguen: en 10 s una cadena legítima tiene muy pocos. */
  const MAX_CADENA = 20;
  /** Reintentos de la gracia cuando otra petición gana la carrera por el último token. */
  const MAX_INTENTOS_GRACIA = 10;

  /**
   * Sigue la cadena de rotación desde `fila` hasta el último token. Devuelve los ids de la cadena (el último al
   * final) solo si ese último sigue vigente; null si la cadena terminó en una revocación que no es rotación
   * (logout, cambio de contraseña, baja o reuso).
   */
  async function cadenaVigente(fila: RefreshTokenBd): Promise<number[] | null> {
    const cadena = [fila.id];
    let siguiente = fila.reemplazadoPorId;
    while (siguiente !== null && cadena.length <= MAX_CADENA) {
      const t = await buscarRefreshTokenPorId(bd, siguiente);
      if (!t) return null;
      cadena.push(t.id);
      if (t.reemplazadoPorId === null) return t.revocadoEn ? null : cadena;
      siguiente = t.reemplazadoPorId;
    }
    return null;
  }

  /**
   * Gracia (SDD S1.15 v1.2 §2.3, DEC-026): un token revocado por rotación hace ≤ SEG_GRACIA_REFRESH s no es
   * reuso si su cadena de rotación termina en un token vigente (el navegador cortó o atrasó la respuesta al
   * recargar). Se revoca ese último, se emite otro con el mismo vencimiento y toda la cadena apunta al nuevo.
   * Si otra petición gana la carrera (las cargas abortadas llegan juntas), se vuelve a leer la cadena, que ya
   * apunta al token ganador, hasta MAX_INTENTOS_GRACIA veces. Devuelve null si es reuso.
   */
  async function refrescarConGracia(hash: string, momento: Date): Promise<ResultadoLogin | null> {
    const { SEG_GRACIA_REFRESH } = await leerParametros(bd, ['SEG_GRACIA_REFRESH']);
    for (let intento = 0; intento < MAX_INTENTOS_GRACIA; intento++) {
      const fila = await buscarRefreshTokenPorHash(bd, hash);
      if (!fila?.revocadoEn || fila.reemplazadoPorId === null) return null;
      if (momento.getTime() - fila.revocadoEn.getTime() > SEG_GRACIA_REFRESH * 1000) return null;
      if (fila.expiraEn <= momento) throw sesionInvalida();
      const cadena = await cadenaVigente(fila);
      if (!cadena) return null;
      const u = await usuarioActivo(fila.usuarioId, momento);
      const sesion = await rotar(u, fila, cadena.at(-1)!, cadena, momento);
      if (sesion) return sesion;
    }
    return null;
  }

  /** Rota el refresh: revoca el viejo y emite uno nuevo con el MISMO vencimiento (DEC-012). */
  async function refrescar(token: string | undefined): Promise<ResultadoLogin> {
    if (!token) throw sesionInvalida();
    const momento = ahora();
    const hash = hashDeToken(token);
    const fila = await buscarRefreshTokenPorHash(bd, hash);
    if (!fila) throw sesionInvalida();
    if (!fila.revocadoEn) {
      if (fila.expiraEn <= momento) throw sesionInvalida();
      const u = await usuarioActivo(fila.usuarioId, momento);
      const sesion = await rotar(u, fila, fila.id, [fila.id], momento);
      if (sesion) return sesion;
      // Otra petición lo rotó en el mismo instante: puede ser la carrera de dos pestañas (gracia).
    }
    return (await refrescarConGracia(hash, momento)) ?? revocarPorReuso(fila.usuarioId, momento);
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
      const { sesion } = await emitirSesion(
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

  /** El login que el captcha frenó antes de mirar la contraseña (ADR-0012): queda en la bitácora. */
  async function rechazoPorCaptcha(usuario: string, motivo: 'CAPTCHA_REQUERIDO' | 'CAPTCHA_INVALIDO') {
    await registrarLoginSinCaptcha(bd, usuario, motivo);
  }

  return { login, rechazoPorCaptcha, refrescar, cerrarSesion, cambiarPassword };
}

export type ServicioAuth = ReturnType<typeof crearServicioAuth>;
