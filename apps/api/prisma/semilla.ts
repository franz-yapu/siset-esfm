import type { ClienteBd } from '../src/compartido/bd';
import { esquemaPassword, hashPassword } from '../src/modulos/seguridad';

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

/**
 * Catálogo provisional de requisitos (SDD S2.1 v1.1, D-04): una fila por requisito concreto,
 * con su año y nivel. Supone una defensa del TCLO por año (se repreguntó en D-04b). La lista
 * completa (unos 30 requisitos, D-18) la manda la escuela; Kardex podrá editarla.
 */
export const REQUISITOS = [
  { codigo: 'TACFI_1', nombre: 'TACFI artístico de 1.º año', anioFormacion: 1, nivel: null },
  { codigo: 'TACFI_2', nombre: 'TACFI artístico de 2.º año', anioFormacion: 2, nivel: null },
  { codigo: 'TCLO_BASICO', nombre: 'TCLO nivel básico', anioFormacion: 1, nivel: 'BASICO' },
  { codigo: 'TCLO_INTERMEDIO', nombre: 'TCLO nivel intermedio', anioFormacion: 2, nivel: 'INTERMEDIO' },
  { codigo: 'TCLO_AVANZADO', nombre: 'TCLO nivel avanzado', anioFormacion: 3, nivel: 'AVANZADO' },
  { codigo: 'CERT_NOTAS', nombre: 'Certificado de notas', anioFormacion: null, nivel: null },
] as const;

/** Lo que dijo la escuela de cada sigla (D-04); no se inventa más. */
const DESCRIPCION_REQUISITO: Partial<Record<(typeof REQUISITOS)[number]['codigo'], string>> = {
  TACFI_1: 'Taller artístico; requisito para defender el diseño metodológico.',
  TACFI_2: 'Taller artístico; requisito para defender el diseño metodológico.',
  TCLO_BASICO: 'Defensa del taller de lengua originaria.',
  TCLO_INTERMEDIO: 'Defensa del taller de lengua originaria.',
  TCLO_AVANZADO: 'Defensa del taller de lengua originaria.',
};

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
  const politica = esquemaPassword.safeParse(password);
  if (!politica.success) {
    // Los mensajes del esquema nunca incluyen la contraseña.
    throw new Error(`SEED_KARDEX_PASSWORD no cumple la regla (DEC-011): ${politica.error.issues[0].message}.`);
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
  requisitosTipo: number;
  personas: number;
  usuarios: number;
}

/**
 * Siembra los catálogos y el Kardex inicial. Idempotente: todo es upsert por
 * clave natural, en una sola transacción. Si el Kardex ya existe, no se toca
 * su contraseña (puede haberla cambiado).
 */
export async function sembrar(bd: ClienteBd, kardex: KardexInicial): Promise<ResultadoSemilla> {
  const passwordHash = await hashPassword(kardex.password);

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
    // update vacío: si Kardex edita un requisito, el seed no lo pisa.
    for (const r of REQUISITOS) {
      await tx.requisitoTipo.upsert({
        where: { codigo: r.codigo },
        create: { ...r, descripcion: DESCRIPCION_REQUISITO[r.codigo] ?? null },
        update: {},
      });
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
      requisitosTipo: await tx.requisitoTipo.count(),
      personas: await tx.persona.count(),
      usuarios: await tx.usuario.count(),
    };
  });
}
