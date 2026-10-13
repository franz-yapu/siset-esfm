import { inject } from 'vitest';
import { crearClienteBd, type ClienteBd } from '@/compartido/bd';
import { hashPassword } from '@/modulos/seguridad';
import type { KardexInicial } from '../../prisma/semilla';

/** Cliente sobre la base temporal que creó `preparar-bd.ts` para esta corrida. */
export function clienteDeTest(): ClienteBd {
  return crearClienteBd(inject('urlBdTest'));
}

/** Valores de prueba, solo para la base de test. */
export const KARDEX_DE_PRUEBA: KardexInicial = {
  ci: '9000001',
  complemento: '',
  password: 'prueba-1234',
  nombres: 'Kardex',
  apellidoPaterno: 'Prueba',
  apellidoMaterno: null,
  sede: 'ANCOCAGUA',
};

export const PASSWORD_DE_PRUEBA = 'clave-1234';
let hashDePrueba: Promise<string> | undefined;

/** Usuario SEC_DIR de La Paz con PASSWORD_DE_PRUEBA (el hash se calcula una sola vez por archivo). */
export async function crearUsuarioDePrueba(
  bd: ClienteBd,
  ci: string,
  extra: { activo?: boolean; debeCambiarPassword?: boolean; bloqueadoHasta?: Date } = {},
) {
  hashDePrueba ??= hashPassword(PASSWORD_DE_PRUEBA);
  const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'SEC_DIR' } });
  const sede = await bd.sede.findUniqueOrThrow({ where: { codigo: 'LA_PAZ' } });
  const persona = await bd.persona.create({ data: { ci, nombres: 'Prueba', apellidoPaterno: 'Sesión' } });
  return bd.usuario.create({
    data: {
      personaId: persona.id,
      rolId: rol.id,
      sedeId: sede.id,
      username: ci,
      passwordHash: await hashDePrueba,
      debeCambiarPassword: false,
      ...extra,
    },
  });
}

/** Valor de la cookie siset_refresh en una respuesta, si la hay (vacío si la borra). */
export const cookieRefresh = (headers: Record<string, unknown>): string | undefined => {
  const lista = ([] as string[]).concat((headers['set-cookie'] as string[] | string | undefined) ?? []);
  const cookie = lista.find((c) => c.startsWith('siset_refresh='));
  return cookie?.split(';')[0].slice('siset_refresh='.length);
};
