import type { ClienteBd, TransaccionBd } from '../src/compartido/bd';
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
  { codigo: 'ADMIN', nombre: 'Administrador' },
] as const;

/** Nombre institucional largo de cada rol (modelo v1, `rol.descripcion`). */
export const DESCRIPCION_ROL: Record<(typeof ROLES)[number]['codigo'], string> = {
  ESTUDIANTE: 'Estudiante en formación',
  EGRESADO: 'Maestro egresado',
  SEC_DIR: 'Secretaría de Dirección General',
  SEC_COORD: 'Secretaría de Coordinación',
  COORDINADOR: 'Coordinador Académico',
  KARDEX: 'Responsable de Archivo Kardex',
  ADMIN: 'Administrador del sistema: usuarios, roles y bitácora (DEC-054)',
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
  anioFormacion?: number;
  obligatorio?: boolean;
  porGestion?: boolean;
  soloAniosTerminados?: boolean;
  pideCurso?: boolean;
  soloGenero?: 'MASCULINO';
  soloModalidad?: string;
  descripcion?: string;
};

const TACFI = 'Certificado legalizado; se anota la fecha, el nombre del curso y la entidad emisora.';
const DEFENSA = 'Requisito para la defensa del diseño metodológico (D-30b, D-39).';
const SI_CORRESPONDE = 'Si corresponde.';
const DEFENSA_TCLO = 'Defensa del taller de lengua originaria; una por año (D-04b, D-46). OBSERVADO si no la aprobó.';

/**
 * Catálogo de requisitos (DEC-051): los 24 de la hoja "Documentación existente en folder personal" de Kardex, en su
 * orden. Los TACFI tienen su año (D-31); lo que todavía no se sabe va con su duda (D-45 a D-47).
 */
const LISTA: readonly Req[] = [
  { codigo: 'ADMISION', nombre: 'Resultado final de admisión con el V.º B.º' },
  { codigo: 'POSTULACION_DGFM', nombre: 'Formulario de postulación emitido por la DGFM' },
  { codigo: 'REGISTRO_SIFMWEB', nombre: 'Hoja de registro personal SIFMWEB' },
  { codigo: 'FOTOCOPIA_CI', nombre: 'Fotocopia de cédula de identidad vigente' },
  {
    codigo: 'CERT_NACIMIENTO',
    nombre: 'Certificado de nacimiento original (Estado Plurinacional de Bolivia)',
  },
  { codigo: 'REJAP', nombre: 'Certificado de antecedentes REJAP' },
  { codigo: 'CENVI', nombre: 'Certificado de no violencia CENVI' },
  { codigo: 'TITULO_BACHILLER', nombre: 'Fotocopia legalizada del título de bachiller' },
  {
    codigo: 'LIBRETA_MILITAR',
    nombre: 'Fotocopia simple de la libreta militar',
    soloGenero: 'MASCULINO',
    descripcion: 'Solo varones.',
  },
  { codigo: 'MATRICULA', nombre: 'Matrícula', porGestion: true, descripcion: `Una por gestión. ${DEFENSA}` },
  {
    codigo: 'CERT_NOTAS',
    nombre: 'Certificado de notas',
    porGestion: true,
    soloAniosTerminados: true,
    descripcion: `Una por gestión. ${DEFENSA}`,
  },
  {
    codigo: 'BOLETIN_TCLOA',
    nombre: 'Boletín de calificaciones TCLOA (3 gestiones académicas)',
    descripcion: 'Provisional hasta D-46.',
  },
  { codigo: 'CERT_TCLOA', nombre: 'Certificado legalizado TCLOA', descripcion: 'Provisional hasta D-46.' },
  // D-46: el TCLOA se defiende; el formulario manual solo anotaba el último certificado. Una defensa por año (D-04b).
  { codigo: 'TCLO_BASICO', nombre: 'Defensa del TCLOA – nivel básico', anioFormacion: 1, descripcion: DEFENSA_TCLO },
  {
    codigo: 'TCLO_INTERMEDIO',
    nombre: 'Defensa del TCLOA – nivel intermedio',
    anioFormacion: 2,
    descripcion: DEFENSA_TCLO,
  },
  {
    codigo: 'TCLO_AVANZADO',
    nombre: 'Defensa del TCLOA – nivel avanzado',
    anioFormacion: 3,
    descripcion: DEFENSA_TCLO,
  },
  {
    codigo: 'TACFI_1',
    nombre: 'Certificado legalizado de TACFI – Artístico I',
    anioFormacion: 1,
    pideCurso: true,
    descripcion: TACFI,
  },
  {
    codigo: 'TACFI_2',
    nombre: 'Certificado legalizado de TACFI – Artístico II',
    anioFormacion: 2,
    pideCurso: true,
    descripcion: TACFI,
  },
  {
    codigo: 'TACFI_TEC_1',
    nombre: 'Certificado legalizado de TACFI – Tecnológico I',
    anioFormacion: 3,
    pideCurso: true,
    descripcion: TACFI,
  },
  {
    codigo: 'TACFI_TEC_2',
    nombre: 'Certificado legalizado de TACFI – Tecnológico II',
    anioFormacion: 4,
    pideCurso: true,
    descripcion: `${TACFI} Antes de la defensa.`,
  },
  {
    codigo: 'PUEBLO_INDIGENA',
    nombre: 'Certificado de pueblo indígena originario',
    soloModalidad: 'B1',
    descripcion: 'Solo modalidad B1.',
  },
  {
    codigo: 'CALIF_SECUNDARIA',
    nombre: 'Certificado de calificaciones original de 1.º a 4.º de secundaria',
    soloModalidad: 'B1',
    descripcion: 'Solo modalidad B1 (D-45b).',
  },
  {
    codigo: 'CARNET_DISCAPACIDAD',
    nombre: 'Carnet de discapacidad CONADEPIS o IBC',
    soloModalidad: 'B3',
    descripcion: 'Solo modalidad B3.',
  },
  {
    codigo: 'LICENCIA_TEMPORAL',
    nombre: 'Licencia temporal',
    obligatorio: false,
    descripcion: SI_CORRESPONDE,
  },
  {
    codigo: 'FORM_REINCORPORACION',
    nombre: 'Formulario de reincorporación',
    obligatorio: false,
    descripcion: SI_CORRESPONDE,
  },
  {
    codigo: 'HISTORIAL_PROVISIONAL',
    nombre: 'Historial académico provisional',
    obligatorio: false,
    descripcion: 'Provisional hasta D-47.',
  },
  {
    codigo: 'RESOLUCION_ACADEMICA',
    nombre: 'Resolución académica por algún caso en particular',
    obligatorio: false,
    descripcion: `${SI_CORRESPONDE} Por ejemplo, la autorización de un TACFI fuera de su año (D-31).`,
  },
];

/** El orden en pantalla es el de la lista: la hoja del folder personal con las defensas del TCLOA (DEC-052). */
export const REQUISITOS = LISTA.map((r, i) => ({ ...r, orden: i + 1 }));

const datosRequisito = (r: Req & { orden: number }) => ({
  nombre: r.nombre,
  orden: r.orden,
  descripcion: r.descripcion ?? null,
  anioFormacion: r.anioFormacion ?? null,
  nivel: null,
  obligatorio: r.obligatorio ?? true,
  porGestion: r.porGestion ?? false,
  soloAniosTerminados: r.soloAniosTerminados ?? false,
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
  return leerCuentaInicial('SEED_KARDEX', 'Kardex', entorno);
}

/**
 * El Administrador inicial (DEC-054): opcional, con las mismas reglas que el Kardex y prefijo `SEED_ADMIN_`. Sin
 * `SEED_ADMIN_CI` devuelve null (una base que ya tiene su Administrador no lo necesita).
 */
export function leerAdminInicial(entorno: Entorno = process.env): KardexInicial | null {
  return texto(entorno.SEED_ADMIN_CI) ? leerCuentaInicial('SEED_ADMIN', 'Administrador', entorno) : null;
}

function leerCuentaInicial(prefijo: string, nombres: string, entorno: Entorno): KardexInicial {
  const v = (sufijo: string) => entorno[`${prefijo}_${sufijo}`];
  const ci = texto(v('CI'));
  const password = v('PASSWORD');
  if (!ci) throw new Error(`Falta ${prefijo}_CI: el CI del ${nombres} inicial.`);
  if (!password) throw new Error(`Falta ${prefijo}_PASSWORD: la contraseña del ${nombres} inicial.`);
  const politica = esquemaPassword.safeParse(password);
  if (!politica.success) {
    // Los mensajes del esquema nunca incluyen la contraseña.
    throw new Error(`${prefijo}_PASSWORD no cumple la regla (DEC-011): ${politica.error.issues[0].message}.`);
  }

  const complemento = texto(v('COMPLEMENTO')) ?? '';
  if (complemento.length > 5) throw new Error(`${prefijo}_COMPLEMENTO admite como máximo 5 caracteres.`);

  const sede = texto(v('SEDE')) ?? 'ANCOCAGUA';
  if (!SEDES.some((s) => s.codigo === sede)) {
    throw new Error(`${prefijo}_SEDE debe ser uno de: ${SEDES.map((s) => s.codigo).join(', ')}.`);
  }

  const apellidoPaterno = v('APELLIDO_PATERNO') === undefined ? 'Inicial' : texto(v('APELLIDO_PATERNO'));
  const apellidoMaterno = texto(v('APELLIDO_MATERNO'));
  if (!apellidoPaterno && !apellidoMaterno) {
    throw new Error(`El ${nombres} inicial necesita al menos un apellido (${prefijo}_APELLIDO_PATERNO o _MATERNO).`);
  }

  return {
    ci,
    complemento,
    password,
    nombres: texto(v('NOMBRES')) ?? nombres,
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
 * Crea la cuenta inicial si no existe. Si ya existe, no se toca (puede haber cambiado su contraseña o su rol).
 * La contraseña viene de una variable de entorno: se cambia al primer ingreso (S1.x).
 */
async function sembrarCuenta(tx: TransaccionBd, cuenta: KardexInicial, rol: 'KARDEX' | 'ADMIN', passwordHash: string) {
  const persona = await tx.persona.upsert({
    where: { ci_complemento: { ci: cuenta.ci, complemento: cuenta.complemento } },
    create: {
      ci: cuenta.ci,
      complemento: cuenta.complemento,
      nombres: cuenta.nombres,
      apellidoPaterno: cuenta.apellidoPaterno,
      apellidoMaterno: cuenta.apellidoMaterno,
    },
    update: {},
  });
  const { id: rolId } = await tx.rol.findUniqueOrThrow({ where: { codigo: rol } });
  const sede = await tx.sede.findUniqueOrThrow({ where: { codigo: cuenta.sede } });
  const username = usernameDe(cuenta.ci, cuenta.complemento);
  await tx.usuario.upsert({
    where: { username },
    create: { username, personaId: persona.id, rolId, sedeId: sede.id, passwordHash, debeCambiarPassword: true },
    update: {},
  });
}

/**
 * Siembra los catálogos, el Kardex inicial y, si viene, el Administrador inicial (DEC-054). Idempotente: todo es
 * upsert por clave natural, en una sola transacción.
 */
export async function sembrar(
  bd: ClienteBd,
  kardex: KardexInicial,
  admin: KardexInicial | null = null,
): Promise<ResultadoSemilla> {
  const passwordHash = await hashPassword(kardex.password);
  const hashAdmin = admin ? await hashPassword(admin.password) : '';

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
    // Kardex ya edita el catálogo (DEC-055): el seed solo crea los que faltan y nunca pisa sus cambios. Un cambio
    // del catálogo que venga de la escuela va en una migración de datos.
    for (const r of REQUISITOS) {
      await tx.requisitoTipo.upsert({
        where: { codigo: r.codigo },
        create: { codigo: r.codigo, ...datosRequisito(r) },
        update: {},
      });
    }

    await sembrarCuenta(tx, kardex, 'KARDEX', passwordHash);
    if (admin) await sembrarCuenta(tx, admin, 'ADMIN', hashAdmin);

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
