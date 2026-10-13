import type { CodigoRequisito, ColorSemaforo, FileAcademico, Requisito, ResultadoAnual } from '@/types';
import { ordinal } from './formato';

/** Límite de UF reprobadas en un mismo año (D-07: configurable; provisional = 2). */
export const LIMITE_UF = 2;

export const NOMBRE_REQUISITO: Record<CodigoRequisito, string> = {
  TACFI: 'TACFI',
  TCLO: 'TCLO',
  CERT_NOTAS: 'Certificado de notas',
};

export const CODIGOS_REQUISITO: CodigoRequisito[] = ['TACFI', 'TCLO', 'CERT_NOTAS'];

export const superaLimite = (r: Pick<ResultadoAnual, 'ufReprobadas'>): boolean => r.ufReprobadas > LIMITE_UF;

/** Primer año que supera el límite de UF reprobadas, si existe. */
export const anioQueBloquea = (file: FileAcademico): ResultadoAnual | undefined => file.resultados.find(superaLimite);

export const motivoBloqueoPorUf = (r: ResultadoAnual): string =>
  `${r.ufReprobadas} UF reprobadas en ${ordinal(r.anio)} año (límite: ${LIMITE_UF})`;

export const semaforoRequisito = (r: Requisito): ColorSemaforo => (r.estado === 'COMPLETO' ? 'VERDE' : 'AMARILLO');

export const requisitosPendientes = (file: FileAcademico): CodigoRequisito[] =>
  CODIGOS_REQUISITO.filter((c) => file.requisitos[c].estado !== 'COMPLETO');

/** Semáforo global (SPEC §8.4): rojo = bloqueado; amarillo = algún pendiente; verde = todo completo. */
export const semaforoFile = (file: FileAcademico): ColorSemaforo => {
  if (file.bloqueado) return 'ROJO';
  return requisitosPendientes(file).length > 0 ? 'AMARILLO' : 'VERDE';
};

/** ¿Puede pasar a dictamen / emitirse? Requiere file sin bloqueo y requisitos completos (PRD §3). */
export const fileHabilitado = (file: FileAcademico): boolean => semaforoFile(file) === 'VERDE';

/** Mensajes de alerta para el estudiante y para Kardex. */
export const alertasFile = (file: FileAcademico): string[] => {
  const alertas: string[] = [];
  if (file.bloqueado) alertas.push(`File bloqueado: ${file.motivoBloqueo ?? 'consulta en Kardex'}. Acércate a Kardex.`);
  for (const c of requisitosPendientes(file)) {
    alertas.push(
      c === 'TACFI'
        ? 'Falta entregar TACFI en Kardex'
        : c === 'TCLO'
          ? 'Falta acreditar el TCLO'
          : 'Falta el certificado de notas',
    );
  }
  return alertas;
};

export const nombreCompleto = (f: Pick<FileAcademico, 'nombres' | 'apellidos'>): string =>
  `${f.nombres} ${f.apellidos}`;

/** Año de formación actual (la matrícula vigente o la última). */
export const anioActual = (file: FileAcademico): number => file.matriculas.at(-1)?.anio ?? 1;

/** ¿Tiene letras (con tildes y ñ), números y algún símbolo (ni letra, ni número, ni espacio)? */
export const combinaLetrasNumerosSimbolos = (clave: string): boolean =>
  /\p{L}/u.test(clave) && /\p{N}/u.test(clave) && /[^\p{L}\p{N}\s]/u.test(clave);

/**
 * Política de contraseña (DEC-011): mín. 8 caracteres, con letras, números y símbolos, y
 * como máximo 72 bytes (límite de bcrypt). Misma regla que `esquemaPassword` de la API.
 */
export const validarClave = (clave: string): string | null => {
  if (clave.length < 8) return 'Debe tener al menos 8 caracteres';
  if (!combinaLetrasNumerosSimbolos(clave)) return 'Debe combinar letras, números y símbolos';
  if (new TextEncoder().encode(clave).length > 72) return 'Es demasiado larga (máximo 72 bytes)';
  return null;
};

export const fuerzaClave = (clave: string): 0 | 1 | 2 | 3 => {
  let p = 0;
  if (clave.length >= 8) p++;
  if (combinaLetrasNumerosSimbolos(clave)) p++;
  if (clave.length >= 12) p++;
  return p as 0 | 1 | 2 | 3;
};
