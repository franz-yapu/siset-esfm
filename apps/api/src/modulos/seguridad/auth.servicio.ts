import { randomBytes } from 'node:crypto';
import type { ClienteBd, TransaccionBd } from '@/compartido/bd';
import { ErrorNoAutenticado } from '@/compartido/errores';
import { obtenerContexto } from '@/compartido/http';
import type { RespuestaLogin } from './auth.esquemas';
import { registrarBloqueo, registrarLogin, registrarLoginFallido, type MotivoLoginFallido } from './eventos-acceso';
import { firmarAccessToken } from './jwt';
import { compararPassword, hashPassword } from './password';
import { crearRefreshToken } from './refresh-token.repositorio';
import { hashDeToken } from './token';
import { bloquearCuenta, buscarUsuarioParaLogin, registrarAcceso, sumarIntentoFallido } from './usuario.repositorio';

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
      throw credencialesInvalidas(); // D-26 (provisional): sin evento
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

    const nombre = await nombreDe(bd, u.personaId);
    const { token: accessToken, expiraEn } = await firmarAccessToken(
      { usuarioId: u.id, rol: u.rol.codigo, sedeId: u.sedeId, debeCambiarPassword: u.debeCambiarPassword },
      jwtSecreto,
      momento,
    );
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiraEn = new Date(momento.getTime() + DURACION_REFRESH_MS);
    const contexto = obtenerContexto();

    await bd.$transaction(async (tx) => {
      await crearRefreshToken(tx, {
        usuarioId: u.id,
        tokenHash: hashDeToken(refreshToken),
        expiraEn: refreshExpiraEn,
        ip: contexto?.ip ?? null,
        userAgent: contexto?.userAgent ?? null,
      });
      await registrarAcceso(tx, u.id, momento);
      await registrarLogin(tx, u.id);
    });

    return {
      accessToken,
      expiraEn: expiraEn.toISOString(),
      refreshToken,
      refreshExpiraEn,
      usuario: {
        id: u.id,
        usuario: u.username,
        nombre,
        rol: u.rol.codigo,
        sedeId: u.sedeId,
        activo: u.activo,
        debeCambiarPassword: u.debeCambiarPassword,
        ultimoAcceso: u.ultimoAcceso?.toISOString() ?? null,
      },
    };
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

  return { login };
}

export type ServicioAuth = ReturnType<typeof crearServicioAuth>;
