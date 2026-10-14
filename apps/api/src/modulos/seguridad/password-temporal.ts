import { randomInt } from 'node:crypto';

// Contraseña temporal que genera el sistema al crear o restablecer una cuenta (SDD S1.8 §2.3).
// Sin caracteres que se confunden al dictarla: 0/O, 1/l/I.

const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz';
const MAYUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITOS = '23456789';
const SIMBOLOS = '#$%&*+-=?@';
const TODOS = MINUSCULAS + MAYUSCULAS + DIGITOS + SIMBOLOS;

export const LARGO_PASSWORD_TEMPORAL = 12;

const elegir = (conjunto: string) => conjunto[randomInt(conjunto.length)];

/** 12 caracteres con al menos una minúscula, una mayúscula, un dígito y un símbolo: cumple DEC-011. */
export function generarPasswordTemporal(): string {
  const caracteres = [elegir(MINUSCULAS), elegir(MAYUSCULAS), elegir(DIGITOS), elegir(SIMBOLOS)];
  while (caracteres.length < LARGO_PASSWORD_TEMPORAL) caracteres.push(elegir(TODOS));
  // Fisher-Yates con randomInt: los obligatorios no quedan siempre al principio.
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}
