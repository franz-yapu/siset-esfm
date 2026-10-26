import { createHmac } from 'node:crypto';
import type { RequestHandler } from 'express';
import { CappedMap, create, randomInt } from 'altcha-lib/frameworks/express';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { ErrorApp } from '@/compartido/errores';

// Captcha del login (ADR-0012): ALTCHA autoalojado, prueba de trabajo, sin servicios de terceros (RNF-09).

/** Ventana del conteo de fallos por IP. */
const VENTANA_MS = 15 * 60_000;
/** Lo que vale un reto. */
const VIGENCIA_MS = 5 * 60_000;
/** Retos ya usados que se recuerdan (cada uno vence a los 5 min): uno solo por login. */
const RETOS_RECORDADOS = 10_000;

export type MotivoCaptcha = 'CAPTCHA_REQUERIDO' | 'CAPTCHA_INVALIDO';

/** El 400 del login cuando falta o no vale el captcha; el código es el motivo y la web muestra el widget. */
export class ErrorCaptcha extends ErrorApp {
  readonly estado = 400;
  constructor(readonly motivo: MotivoCaptcha) {
    super(
      motivo === 'CAPTCHA_REQUERIDO'
        ? 'Hubo varios intentos fallidos desde esta conexión. Confirme que no es un robot y vuelva a ingresar.'
        : 'La verificación venció o no es válida. Vuelva a hacerla.',
      motivo,
    );
  }
}

/**
 * Cuenta los logins fallidos por IP y, desde `trasFallos`, exige un reto ALTCHA resuelto. En memoria, como el rate
 * limit: hay una sola instancia de la API. Las claves HMAC se derivan del secreto del JWT (sin variable nueva).
 */
export function crearCaptcha({
  jwtSecreto,
  trasFallos,
  ahora = () => Date.now(),
}: {
  jwtSecreto: string;
  trasFallos: number;
  ahora?: () => number;
}) {
  const clave = (uso: string) => createHmac('sha256', jwtSecreto).update(`siset-captcha-${uso}`).digest('hex');
  const firma = clave('firma');
  const claveDerivada = clave('clave');
  const usados = new CappedMap({ maxSize: RETOS_RECORDADOS });
  const altcha = create({
    deriveKey,
    hmacSignatureSecret: firma,
    hmacKeySignatureSecret: claveDerivada,
    store: usados,
    createChallengeParameters: () => ({
      algorithm: 'PBKDF2/SHA-256',
      cost: 1_000,
      counter: randomInt(1_000, 5_000),
      expiresAt: new Date(ahora() + VIGENCIA_MS),
    }),
  });
  const fallos = new Map<string, { n: number; desde: number }>();

  const vigentes = (ip: string) => {
    const f = fallos.get(ip);
    if (!f) return 0;
    if (ahora() - f.desde > VENTANA_MS) {
      fallos.delete(ip);
      return 0;
    }
    return f.n;
  };

  return {
    /** GET /auth/captcha: un reto firmado que vence en 5 minutos. */
    reto: altcha.challengeHandler satisfies RequestHandler,

    requerido: (ip: string) => trasFallos > 0 && vigentes(ip) >= trasFallos,

    fallo(ip: string) {
      if (trasFallos === 0) return;
      const n = vigentes(ip);
      fallos.set(ip, { n: n + 1, desde: n === 0 ? ahora() : fallos.get(ip)!.desde });
    },

    exito: (ip: string) => void fallos.delete(ip),

    /** Lanza `ErrorCaptcha` si falta o no verifica (firma, vencimiento, ya usado). */
    async verificar(solucion: string | undefined): Promise<void> {
      if (!solucion) throw new ErrorCaptcha('CAPTCHA_REQUERIDO');
      const r = await altcha.verify(solucion, deriveKey, firma, claveDerivada, usados);
      if (r.error || !r.verification?.verified) throw new ErrorCaptcha('CAPTCHA_INVALIDO');
    },
  };
}

export type Captcha = ReturnType<typeof crearCaptcha>;
