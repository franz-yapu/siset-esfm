import type { ClienteBd } from '../src/compartido/bd';
import { esquemaPassword, hashPassword, usernameDe } from '../src/modulos/seguridad';

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
  { codigo: 'LA_PAZ', nombre: 'Calahumana (La Paz)' },
  { codigo: 'ANCOCAGUA', nombre: 'UA Ancocagua (Pucarani)' },
] as const;

export const ESPECIALIDADES = [
  'Educación Primaria Comunitaria Vocacional',
  'Matemática',
  'Comunicación y Lenguajes',
  'Ciencias Naturales: Biología-Geografía',
  'Educación Física y Deportes',
] as const;

type Req = {
  codigo: string;
  nombre: string;
  orden: number;
  anioFormacion?: number;
  obligatorio?: boolean;
  porGestion?: boolean;
  pideCurso?: boolean;
  soloGenero?: 'MASCULINO';
  soloModalidad?: string;
  descripcion?: string;
};

const TACFI = 'Certificado legalizado; se anota la fecha, el nombre del curso y la entidad emisora.';
const DEFENSA = 'Requisito para la defensa del diseño metodológico (D-30b, D-39).';
const SI_CORRESPONDE = 'Si corresponde.';

/**
 * Catálogo de requisitos (DEC-051): los 24 de la hoja "Documentación existente en folder personal" de Kardex, en su
 * orden. Los TACFI tienen su año (D-31); lo que todavía no se sabe va con su duda (D-45 a D-47).
 */
export const REQUISITOS: readonly Req[] = [
  { codigo: 'ADMISION', nombre: 'Resultado final de admisión con el V.º B.º', orden: 1 },
  { codigo: 'POSTULACION_DGFM', nombre: 'Formulario de postulación emitido por la DGFM', orden: 2 },
  { codigo: 'REGISTRO_SIFMWEB', nombre: 'Hoja de registro personal SIFMWEB', orden: 3 },
  { codigo: 'FOTOCOPIA_CI', nombre: 'Fotocopia de cédula de identidad vigente', orden: 4 },
  {
    codigo: 'CERT_NACIMIENTO',
    nombre: 'Certificado de nacimiento original (Estado Plurinacional de Bolivia)',
    orden: 5,
  },
  { codigo: 'REJAP', nombre: 'Certificado de antecedentes REJAP', orden: 6 },
  { codigo: 'CENVI', nombre: 'Certificado de no violencia CENVI', orden: 7 },
  { codigo: 'TITULO_BACHILLER', nombre: 'Fotocopia legalizada del título de bachiller', orden: 8 },
  {
    codigo: 'LIBRETA_MILITAR',
    nombre: 'Fotocopia simple de la libreta militar',
    orden: 9,
    soloGenero: 'MASCULINO',
    descripcion: 'Solo varones.',
  },
  { codigo: 'MATRICULA', nombre: 'Matrícula', orden: 10, porGestion: true, descripcion: `Una por gestión. ${DEFENSA}` },
  {
    codigo: 'CERT_NOTAS',
    nombre: 'Certificado de notas',
    orden: 11,
    porGestion: true,
    descripcion: `Una por gestión. ${DEFENSA}`,
  },
  {
    codigo: 'BOLETIN_TCLOA',
    nombre: 'Boletín de calificaciones TCLOA (3 gestiones académicas)',
    orden: 12,
    descripcion: 'Provisional hasta D-46.',
  },
  { codigo: 'CERT_TCLOA', nombre: 'Certificado legalizado TCLOA', orden: 13, descripcion: 'Provisional hasta D-46.' },
  {
    codigo: 'TACFI_1',
    nombre: 'Certificado legalizado de TACFI – Artístico I',
    orden: 14,
    anioFormacion: 1,
    pideCurso: true,
    descripcion: TACFI,
  },
  {
    codigo: 'TACFI_2',
    nombre: 'Certificado legalizado de TACFI – Artístico II',
    orden: 15,
    anioFormacion: 2,
    pideCurso: true,
    descripcion: TACFI,
  },
  {
    codigo: 'TACFI_TEC_1',
    nombre: 'Certificado legalizado de TACFI – Tecnológico I',
    orden: 16,
    anioFormacion: 3,
    pideCurso: true,
    descripcion: TACFI,
  },
  {
    codigo: 'TACFI_TEC_2',
    nombre: 'Certificado legalizado de TACFI – Tecnológico II',
    orden: 17,
    anioFormacion: 4,
    pideCurso: true,
    descripcion: `${TACFI} Antes de la defensa.`,
  },
  {
    codigo: 'PUEBLO_INDIGENA',
    nombre: 'Certificado de pueblo indígena originario',
    orden: 18,
    soloModalidad: 'B1',
    descripcion: 'Solo modalidad B1.',
  },
  {
    codigo: 'CALIF_SECUNDARIA',
    nombre: 'Certificado de calificaciones original de 1.º a 4.º de secundaria',
    orden: 19,
    soloModalidad: 'B',
    descripcion: 'Solo modalidad B (D-45).',
  },
  {
    codigo: 'CARNET_DISCAPACIDAD',
    nombre: 'Carnet de discapacidad CONADEPIS o IBC',
    orden: 20,
    soloModalidad: 'B3',
    descripcion: 'Solo modalidad B3.',
  },
  {
    codigo: 'LICENCIA_TEMPORAL',
    nombre: 'Licencia temporal',
    orden: 21,
    obligatorio: false,
    descripcion: SI_CORRESPONDE,
  },
  {
    codigo: 'FORM_REINCORPORACION',
    nombre: 'Formulario de reincorporación',
    orden: 22,
    obligatorio: false,
    descripcion: SI_CORRESPONDE,
  },
  {
    codigo: 'HISTORIAL_PROVISIONAL',
    nombre: 'Historial académico provisional',
    orden: 23,
    obligatorio: false,
    descripcion: 'Provisional hasta D-47.',
  },
  {
    codigo: 'RESOLUCION_ACADEMICA',
    nombre: 'Resolución académica por algún caso en particular',
    orden: 24,
    obligatorio: false,
    descripcion: `${SI_CORRESPONDE} Por ejemplo, la autorización de un TACFI fuera de su año (D-31).`,
  },
];

/** Los del catálogo provisional que ya no están en la hoja oficial: se dan de baja (lo registrado se conserva). */
export const REQUISITOS_RETIRADOS = ['TCLO_BASICO', 'TCLO_INTERMEDIO', 'TCLO_AVANZADO'] as const;

const datosRequisito = (r: Req) => ({
  nombre: r.nombre,
  orden: r.orden,
  descripcion: r.descripcion ?? null,
  anioFormacion: r.anioFormacion ?? null,
  nivel: null,
  obligatorio: r.obligatorio ?? true,
  porGestion: r.porGestion ?? false,
  pideCurso: r.pideCurso ?? false,
  soloGenero: r.soloGenero ?? null,
  soloModalidad: r.soloModalidad ?? null,
  activo: true,
});

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
    // El seed manda sobre el catálogo mientras Kardex no tenga cómo editarlo (DEC-051).
    for (const r of REQUISITOS) {
      const datos = datosRequisito(r);
      await tx.requisitoTipo.upsert({
        where: { codigo: r.codigo },
        create: { codigo: r.codigo, ...datos },
        update: datos,
      });
    }
    await tx.requisitoTipo.updateMany({
      where: { codigo: { in: [...REQUISITOS_RETIRADOS] } },
      data: { activo: false },
    });

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
      requisitosTipo: await tx.requisitoTipo.count({ where: { activo: true } }),
      personas: await tx.persona.count(),
      usuarios: await tx.usuario.count(),
    };
  });
}
