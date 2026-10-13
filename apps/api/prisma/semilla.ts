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

/** Nombre institucional largo de cada rol (modelo v1, `rol.descripcion`). */
export const DESCRIPCION_ROL: Record<(typeof ROLES)[number]['codigo'], string> = {
  ESTUDIANTE: 'Estudiante en formación',
  EGRESADO: 'Maestro egresado',
  SEC_DIR: 'Secretaría de Dirección General',
  SEC_COORD: 'Secretaría de Coordinación',
  COORDINADOR: 'Coordinador Académico',
  KARDEX: 'Responsable de Archivo Kardex',
};

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

type CodigoSede = (typeof SEDES)[number]['codigo'];

export interface KardexInicial {
  ci: string;
  /** '' cuando no tiene (modelo v1). */
  complemento: string;
  password: string;
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  sede: CodigoSede;
}

type Entorno = Record<string, string | undefined>;

const texto = (v: string | undefined): string | null => v?.trim() || null;

/** Lee y valida los datos del Kardex inicial (SDD S0.11 §2.3). Nunca incluye la contraseña en los mensajes de error. */
export function leerKardexInicial(entorno: Entorno = process.env): KardexInicial {
  const ci = texto(entorno.SEED_KARDEX_CI);
  const password = entorno.SEED_KARDEX_PASSWORD;
  if (!ci) throw new Error('Falta SEED_KARDEX_CI: el CI del Kardex inicial.');
  if (!password) throw new Error('Falta SEED_KARDEX_PASSWORD: la contraseña del Kardex inicial.');
  if (!REGLA_CONTRASENA.test(password)) {
    throw new Error('SEED_KARDEX_PASSWORD no cumple la regla: mínimo 8 caracteres, con letras y números.');
  }

  const complemento = texto(entorno.SEED_KARDEX_COMPLEMENTO) ?? '';
  if (complemento.length > 5) throw new Error('SEED_KARDEX_COMPLEMENTO admite como máximo 5 caracteres.');

  const sede = texto(entorno.SEED_KARDEX_SEDE) ?? 'ANCOCAGUA';
  if (!SEDES.some((s) => s.codigo === sede)) {
    throw new Error(`SEED_KARDEX_SEDE debe ser uno de: ${SEDES.map((s) => s.codigo).join(', ')}.`);
  }

  const apellidoPaterno =
    entorno.SEED_KARDEX_APELLIDO_PATERNO === undefined ? 'Inicial' : texto(entorno.SEED_KARDEX_APELLIDO_PATERNO);
  const apellidoMaterno = texto(entorno.SEED_KARDEX_APELLIDO_MATERNO);
  if (!apellidoPaterno && !apellidoMaterno) {
    throw new Error('El Kardex inicial necesita al menos un apellido (SEED_KARDEX_APELLIDO_PATERNO o _MATERNO).');
  }

  return {
    ci,
    complemento,
    password,
    nombres: texto(entorno.SEED_KARDEX_NOMBRES) ?? 'Kardex',
    apellidoPaterno,
    apellidoMaterno,
    sede: sede as CodigoSede,
  };
}

/** Nombre de usuario: el CI, con el complemento si lo hay (SDD S0.11 §2.4). */
export const usernameDe = (ci: string, complemento: string): string => (complemento ? `${ci}-${complemento}` : ci);

export interface ResultadoSemilla {
  roles: number;
  sedes: number;
  especialidades: number;
  personas: number;
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
      const datos = { ...rol, descripcion: DESCRIPCION_ROL[rol.codigo] };
      await tx.rol.upsert({ where: { codigo: rol.codigo }, create: datos, update: datos });
    }
    for (const sede of SEDES) {
      await tx.sede.upsert({ where: { codigo: sede.codigo }, create: sede, update: { nombre: sede.nombre } });
    }
    for (const nombre of ESPECIALIDADES) {
      await tx.especialidad.upsert({ where: { nombre }, create: { nombre }, update: {} });
    }

    const persona = await tx.persona.upsert({
      where: { ci_complemento: { ci: kardex.ci, complemento: kardex.complemento } },
      create: {
        ci: kardex.ci,
        complemento: kardex.complemento,
        nombres: kardex.nombres,
        apellidoPaterno: kardex.apellidoPaterno,
        apellidoMaterno: kardex.apellidoMaterno,
      },
      update: {},
    });
    const rolKardex = await tx.rol.findUniqueOrThrow({ where: { codigo: 'KARDEX' } });
    const sede = await tx.sede.findUniqueOrThrow({ where: { codigo: kardex.sede } });
    await tx.usuario.upsert({
      where: { username: usernameDe(kardex.ci, kardex.complemento) },
      create: {
        username: usernameDe(kardex.ci, kardex.complemento),
        personaId: persona.id,
        rolId: rolKardex.id,
        sedeId: sede.id,
        passwordHash,
        // La contraseña viene de una variable de entorno: Kardex la cambia al primer ingreso (S1.x).
        debeCambiarPassword: true,
      },
      update: {},
    });

    return {
      roles: await tx.rol.count(),
      sedes: await tx.sede.count(),
      especialidades: await tx.especialidad.count(),
      personas: await tx.persona.count(),
      usuarios: await tx.usuario.count(),
    };
  });
}
