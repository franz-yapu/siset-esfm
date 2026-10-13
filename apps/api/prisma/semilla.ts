import bcrypt from 'bcryptjs';
import type { ClienteBd } from '../src/compartido/bd';

// Valores copiados de apps/web/src/config/{permisos,catalogos}.ts (mismos códigos
// y nombres que el prototipo). La API no importa del frontend; el test
// catalogos-seed.test.ts verifica que sigan iguales.
export const ROLES = [
  { codigo: 'ESTUDIANTE', nombre: 'Estudiante' },
  { codigo: 'EGRESADO', nombre: 'Egresado' },
  { codigo: 'SEC_DIR', nombre: 'Secretaría de Dirección' },
  { codigo: 'SEC_COORD', nombre: 'Secretaría de Coordinación' },
  { codigo: 'COORDINADOR', nombre: 'Coordinador Académico' },
  { codigo: 'KARDEX', nombre: 'Kardex' },
] as const;

export const SEDES = [
  { codigo: 'LA_PAZ', nombre: 'Sede Central La Paz' },
  { codigo: 'ANCOCAGUA', nombre: 'UA Ancocagua (Pucarani)' },
] as const;

export const ESPECIALIDADES = [
  'Educación Primaria Comunitaria Vocacional',
  'Matemática',
  'Comunicación y Lenguajes',
  'Ciencias Naturales: Biología-Geografía',
  'Educación Física y Deportes',
] as const;

/** RNF-01: bcrypt con costo ≥ 12. */
export const COSTO_BCRYPT = 12;

/** business-rules §Seguridad: mínimo 8 caracteres, con letras y números. */
const REGLA_CONTRASENA = /^(?=.*\p{L})(?=.*\d).{8,}$/u;

export interface KardexInicial {
  ci: string;
  password: string;
  nombres: string;
  apellidos: string;
}

type Entorno = Record<string, string | undefined>;

/** Lee y valida los datos del Kardex inicial. Nunca incluye la contraseña en los mensajes de error. */
export function leerKardexInicial(entorno: Entorno = process.env): KardexInicial {
  const ci = entorno.SEED_KARDEX_CI?.trim();
  const password = entorno.SEED_KARDEX_PASSWORD;
  if (!ci) throw new Error('Falta SEED_KARDEX_CI: el CI del Kardex inicial.');
  if (!password) throw new Error('Falta SEED_KARDEX_PASSWORD: la contraseña del Kardex inicial.');
  if (!REGLA_CONTRASENA.test(password)) {
    throw new Error('SEED_KARDEX_PASSWORD no cumple la regla: mínimo 8 caracteres, con letras y números.');
  }
  return {
    ci,
    password,
    nombres: entorno.SEED_KARDEX_NOMBRES?.trim() || 'Kardex',
    apellidos: entorno.SEED_KARDEX_APELLIDOS?.trim() || 'Inicial',
  };
}

export interface ResultadoSemilla {
  roles: number;
  sedes: number;
  especialidades: number;
  usuarios: number;
}

/**
 * Siembra los catálogos y el Kardex inicial. Idempotente: todo es upsert por
 * clave natural, en una sola transacción. Si el Kardex ya existe, no se toca
 * su contraseña (puede haberla cambiado).
 */
export async function sembrar(bd: ClienteBd, kardex: KardexInicial): Promise<ResultadoSemilla> {
  const passwordHash = await bcrypt.hash(kardex.password, COSTO_BCRYPT);

  return bd.$transaction(async (tx) => {
    for (const rol of ROLES) {
      await tx.rol.upsert({ where: { codigo: rol.codigo }, create: rol, update: { nombre: rol.nombre } });
    }
    for (const sede of SEDES) {
      await tx.sede.upsert({ where: { codigo: sede.codigo }, create: sede, update: { nombre: sede.nombre } });
    }
    for (const nombre of ESPECIALIDADES) {
      await tx.especialidad.upsert({ where: { nombre }, create: { nombre }, update: {} });
    }

    const rolKardex = await tx.rol.findUniqueOrThrow({ where: { codigo: 'KARDEX' } });
    await tx.usuario.upsert({
      where: { ci: kardex.ci },
      create: {
        ci: kardex.ci,
        nombres: kardex.nombres,
        apellidos: kardex.apellidos,
        passwordHash,
        rolId: rolKardex.id,
      },
      update: {},
    });

    return {
      roles: await tx.rol.count(),
      sedes: await tx.sede.count(),
      especialidades: await tx.especialidad.count(),
      usuarios: await tx.usuario.count(),
    };
  });
}
