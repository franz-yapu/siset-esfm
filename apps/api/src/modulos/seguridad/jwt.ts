import { jwtVerify, SignJWT } from 'jose';

/** Access token: 15 min (business-rules §Seguridad). */
export const DURACION_ACCESS_MS = 15 * 60_000;
export const EMISOR_JWT = 'siset';

export interface DatosAccessToken {
  usuarioId: number;
  rol: string;
  sedeId: number | null;
  debeCambiarPassword: boolean;
}

/**
 * Firma el access JWT (HS256, SDD S1.3 §2.3). El rol y la sede van en el token
 * porque ADR-0002 exige tomarlos de ahí y nunca del cliente; `cpw` permite que
 * S1.6 obligue a cambiar la contraseña sin consultar la base.
 */
export async function firmarAccessToken(
  datos: DatosAccessToken,
  secreto: string,
  ahora: Date,
): Promise<{ token: string; expiraEn: Date }> {
  const iat = Math.floor(ahora.getTime() / 1000);
  const expiraEn = new Date(iat * 1000 + DURACION_ACCESS_MS);
  const token = await new SignJWT({ rol: datos.rol, sede: datos.sedeId, cpw: datos.debeCambiarPassword })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(datos.usuarioId))
    .setIssuer(EMISOR_JWT)
    .setIssuedAt(iat)
    .setExpirationTime(Math.floor(expiraEn.getTime() / 1000))
    .sign(new TextEncoder().encode(secreto));
  return { token, expiraEn };
}

/**
 * Verifica firma (solo HS256, para que nadie cuele otro algoritmo), emisor y
 * vencimiento (SDD S1.5 §2.4). Lanza si algo no cuadra.
 */
export async function verificarAccessToken(token: string, secreto: string): Promise<DatosAccessToken> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secreto), {
    algorithms: ['HS256'],
    issuer: EMISOR_JWT,
  });
  const usuarioId = Number(payload.sub);
  const { rol, sede, cpw } = payload;
  if (
    !Number.isInteger(usuarioId) ||
    typeof rol !== 'string' ||
    !(sede === null || typeof sede === 'number') ||
    typeof cpw !== 'boolean'
  ) {
    throw new Error('El access token no tiene el formato esperado.');
  }
  return { usuarioId, rol, sedeId: sede, debeCambiarPassword: cpw };
}
