import type { ClienteBd, TransaccionBd } from '@/compartido/bd';

/** Claves de `parametro` que usa el código; crece con cada parámetro nuevo (SDD S1.4 §2.2). */
export type ClaveParametro = 'MAX_INTENTOS_LOGIN' | 'MIN_BLOQUEO_LOGIN';

/**
 * Lee parámetros enteros positivos. Si alguno falta o no es un entero > 0, lanza:
 * es un error de configuración, nunca se toma un valor por defecto (SDD S1.1 §2.1).
 */
export async function leerParametrosEnteros<C extends ClaveParametro>(
  cliente: ClienteBd | TransaccionBd,
  claves: readonly C[],
): Promise<Record<C, number>> {
  const filas = await cliente.parametro.findMany({ where: { clave: { in: [...claves] } } });
  const valores = {} as Record<C, number>;
  for (const clave of claves) {
    const valor = filas.find((f) => f.clave === clave)?.valor;
    if (valor === undefined || !/^[1-9]\d*$/.test(valor.trim())) {
      throw new Error(`El parámetro ${clave} falta o no es un entero positivo: revisá la tabla parametro.`);
    }
    valores[clave] = Number(valor.trim());
  }
  return valores;
}

export const leerParametroEntero = async (cliente: ClienteBd | TransaccionBd, clave: ClaveParametro): Promise<number> =>
  (await leerParametrosEnteros(cliente, [clave]))[clave];
