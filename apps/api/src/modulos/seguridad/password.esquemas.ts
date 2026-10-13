import { z } from 'zod';

// Política de contraseña (DEC-011, SDD S1.2 §2.2). La web aplica la misma regla en
// apps/web/src/lib/reglas.ts (`validarClave`); ambos lados prueban la misma tabla de casos.

export const MENSAJES_PASSWORD = {
  corta: 'Debe tener al menos 8 caracteres',
  sinCombinar: 'Debe combinar letras, números y símbolos',
  larga: 'Es demasiado larga (máximo 72 bytes)',
} as const;

/** bcrypt solo usa los primeros 72 bytes: más allá, dos contraseñas distintas valdrían lo mismo. */
const MAX_BYTES = 72;

/** Símbolo: cualquier carácter que no sea letra, número ni espacio. */
const combinaLetrasNumerosSimbolos = (v: string): boolean =>
  /\p{L}/u.test(v) && /\p{N}/u.test(v) && /[^\p{L}\p{N}\s]/u.test(v);

export const esquemaPassword = z
  .string()
  .min(8, MENSAJES_PASSWORD.corta)
  .refine(combinaLetrasNumerosSimbolos, MENSAJES_PASSWORD.sinCombinar)
  .refine((v) => Buffer.byteLength(v, 'utf8') <= MAX_BYTES, MENSAJES_PASSWORD.larga);
