import { randomUUID } from 'node:crypto';
import type { ClienteBd } from '../src/compartido/bd';
import { esquemaPassword, hashPassword, usernameDe } from '../src/modulos/seguridad';
import { TRANSICIONES } from '../src/modulos/hojas-ruta';

// Datos de prueba FICTICIOS para el despliegue de prueba (SDD S0.12 §2.3, DEC-036). Solo corren con
// DATOS_PRUEBA=1 y son idempotentes: si ya están cargados, no hacen nada. Se cargan directo en la base, sin eventos
// de bitácora: la bitácora registra lo que se haga en la prueba. Las cuentas de prueba se reparan en cada corrida
// (SDD S0.12 §2.5): las publica el login de la prueba, y alguien puede cambiarles la contraseña o bloquearlas.

const NOMBRES = [
  'Ana',
  'Rosa',
  'Juan',
  'Elsa',
  'Mario',
  'Lidia',
  'Pedro',
  'Celia',
  'Hugo',
  'Nancy',
  'Raúl',
  'Sonia',
  'Iván',
  'Gladys',
  'Félix',
];
const PATERNOS = ['Mamani', 'Quispe', 'Condori', 'Choque', 'Huanca', 'Apaza', 'Ticona', 'Limachi', 'Calle', 'Yujra'];
const MATERNOS = ['Flores', 'Alanoca', 'Cruz', 'Paco', 'Tarqui', 'Laura', 'Copa', null];

/** Primer CI de los files de prueba: marca también si ya están cargados. */
const CI_INICIAL = 8100001;
const TOTAL_FILES = 30;
const EGRESADOS = 22;

const PERSONAL = [
  { ci: '9000002', nombres: 'Secretaría', paterno: 'Dirección', rol: 'SEC_DIR', sede: 'LA_PAZ' },
  { ci: '9000003', nombres: 'Secretaría', paterno: 'Coordinación', rol: 'SEC_COORD', sede: 'ANCOCAGUA' },
  { ci: '9000004', nombres: 'Coordinador', paterno: 'Académico', rol: 'COORDINADOR', sede: 'ANCOCAGUA' },
] as const;

/** Cuántos pasos avanza cada hoja de prueba desde RECIBIDO, por tipo (los dos flujos, ADR-0005). */
const HOJAS: { tipo: string; pasos: number }[] = [
  { tipo: 'HISTORIAL_ACADEMICO', pasos: 0 },
  { tipo: 'HISTORIAL_ACADEMICO', pasos: 2 },
  { tipo: 'LEGALIZACION_HISTORIAL', pasos: 4 },
  { tipo: 'HISTORIAL_ACADEMICO', pasos: 6 },
  { tipo: 'CERT_NOTAS_ANTERIOR', pasos: 1 },
  { tipo: 'CERT_NOTAS_ANTERIOR', pasos: 3 },
  { tipo: 'CERT_EXCELENCIA_ANTERIOR', pasos: 5 },
  { tipo: 'CERT_EXCELENCIA_ANTERIOR', pasos: 7 },
];

/** CI del Kardex inicial del seed en la prueba (SEED_KARDEX_CI del compose de Coolify). */
const CI_KARDEX_PRUEBA = '9000001';

/** Estudiante de prueba para "mi file" (S2.7): file 25, estudiante, sin bloqueo y con un requisito observado. */
const CI_ESTUDIANTE_PRUEBA = String(CI_INICIAL + 24);

/** Usuarios de las cuentas de prueba que muestra el login (SDD S0.12 §2.5). */
export const CUENTAS_PRUEBA = [CI_KARDEX_PRUEBA, ...PERSONAL.map((p) => p.ci), CI_ESTUDIANTE_PRUEBA].map((ci) =>
  usernameDe(ci, ''),
);

/**
 * Crea la cuenta del estudiante de prueba si su file existe y aún no tiene cuenta (DEC-043). Va aparte de
 * `cargarDatosPrueba` porque en la prueba los datos ya estaban cargados; la contraseña la pone `repararCuentasPrueba`.
 */
export async function asegurarEstudiantePrueba(bd: ClienteBd): Promise<boolean> {
  const persona = await bd.persona.findUnique({
    where: { ci_complemento: { ci: CI_ESTUDIANTE_PRUEBA, complemento: '' } },
    select: { id: true, usuario: { select: { id: true } } },
  });
  if (!persona || persona.usuario) return false;
  const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'ESTUDIANTE' } });
  await bd.usuario.create({
    data: {
      personaId: persona.id,
      rolId: rol.id,
      username: usernameDe(CI_ESTUDIANTE_PRUEBA, ''),
      // Se reemplaza enseguida con la contraseña común (repararCuentasPrueba).
      passwordHash: await hashPassword(randomUUID()),
      debeCambiarPassword: false,
    },
  });
  return true;
}

/**
 * Deja las cuentas de prueba como las publica el login: con la contraseña común, sin pedir cambiarla, activas, sin
 * intentos fallidos ni bloqueo y sin sesiones abiertas. Devuelve cuántas reparó (las que existen).
 */
export async function repararCuentasPrueba(bd: ClienteBd, password: string): Promise<number> {
  const politica = esquemaPassword.safeParse(password);
  if (!politica.success) throw new Error(`DATOS_PRUEBA_PASSWORD no cumple la regla (DEC-011).`);
  const hash = await hashPassword(password);
  return bd.$transaction(async (tx) => {
    const usuarios = await tx.usuario.findMany({ where: { username: { in: CUENTAS_PRUEBA } }, select: { id: true } });
    const ids = usuarios.map((u) => u.id);
    await tx.usuario.updateMany({
      where: { id: { in: ids } },
      data: { passwordHash: hash, debeCambiarPassword: false, activo: true, intentosFallidos: 0, bloqueadoHasta: null },
    });
    await tx.refreshToken.updateMany({
      where: { usuarioId: { in: ids }, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
    return ids.length;
  });
}

export interface ResultadoDatosPrueba {
  cargados: boolean;
  personal: number;
  files: number;
  hojas: number;
}

const fecha = (diasAtras: number) => new Date(Date.now() - diasAtras * 24 * 60 * 60_000);

export async function cargarDatosPrueba(bd: ClienteBd, password: string): Promise<ResultadoDatosPrueba> {
  if (await bd.persona.findUnique({ where: { ci_complemento: { ci: String(CI_INICIAL), complemento: '' } } })) {
    return { cargados: false, personal: 0, files: 0, hojas: 0 };
  }
  const politica = esquemaPassword.safeParse(password);
  if (!politica.success) throw new Error(`DATOS_PRUEBA_PASSWORD no cumple la regla (DEC-011).`);
  const hash = await hashPassword(password);

  return bd.$transaction(
    async (tx) => {
      const sedes = Object.fromEntries((await tx.sede.findMany()).map((s) => [s.codigo, s.id]));
      const roles = Object.fromEntries((await tx.rol.findMany()).map((r) => [r.codigo, r.id]));
      const especialidades = (await tx.especialidad.findMany({ orderBy: { id: 'asc' } })).map((e) => e.id);
      const requisitos = await tx.requisitoTipo.findMany({ where: { activo: true }, orderBy: { id: 'asc' } });
      const tipos = Object.fromEntries((await tx.tipoTramite.findMany()).map((t) => [t.codigo, t]));
      const kardex = await tx.usuario.findFirstOrThrow({
        where: { rol: { codigo: 'KARDEX' } },
        orderBy: { id: 'asc' },
      });

      // Personal de prueba (el Kardex inicial lo crea el seed).
      const usuarios: Record<string, { id: number; sedeId: number }> = {
        KARDEX: { id: kardex.id, sedeId: kardex.sedeId! },
      };
      for (const p of PERSONAL) {
        const persona = await tx.persona.upsert({
          where: { ci_complemento: { ci: p.ci, complemento: '' } },
          create: { ci: p.ci, nombres: p.nombres, apellidoPaterno: p.paterno },
          update: {},
        });
        const u = await tx.usuario.upsert({
          where: { username: usernameDe(p.ci, '') },
          create: {
            personaId: persona.id,
            rolId: roles[p.rol],
            sedeId: sedes[p.sede],
            username: usernameDe(p.ci, ''),
            passwordHash: hash,
            debeCambiarPassword: false,
          },
          update: {},
        });
        usuarios[p.rol] = { id: u.id, sedeId: sedes[p.sede] };
      }

      // Files: egresados y estudiantes, con requisitos variados para ver los tres colores del semáforo.
      const egresados: number[] = [];
      for (let i = 0; i < TOTAL_FILES; i++) {
        const persona = await tx.persona.create({
          data: {
            ci: String(CI_INICIAL + i),
            nombres: NOMBRES[i % NOMBRES.length],
            apellidoPaterno: PATERNOS[(i * 3) % PATERNOS.length],
            apellidoMaterno: MATERNOS[(i * 5) % MATERNOS.length],
            fechaNacimiento: new Date(Date.UTC(1995 + (i % 8), i % 12, 1 + (i % 27))),
            celular: `7${String(1000000 + i * 37).slice(-7)}`,
          },
        });
        const egresado = i < EGRESADOS;
        const bloqueado = i === 5 || i === 17;
        const f = await tx.fileAcademico.create({
          data: {
            personaId: persona.id,
            codigoEstudiante: `PRB-${String(i + 1).padStart(4, '0')}`,
            especialidadId: especialidades[i % especialidades.length],
            anioIngreso: egresado ? 2018 + (i % 4) : 2022 + (i % 4),
            condicion: egresado ? 'EGRESADO' : 'ESTUDIANTE',
            bloqueado,
            motivoBloqueo: bloqueado ? 'Permiso obligatorio por una gestión, por reprobación (dato de prueba)' : null,
          },
        });
        // Tres de cada cuatro egresados con todo completo; observado uno de cada siete; el resto, pendientes.
        for (const [j, r] of requisitos.entries()) {
          const completo = egresado ? i % 4 !== 0 || j !== i % requisitos.length : j < i % 3;
          const observado = i % 7 === 3 && r.codigo.startsWith('TCLO');
          if (!completo && !observado) continue;
          await tx.requisitoFile.create({
            data: {
              fileId: f.id,
              requisitoTipoId: r.id,
              estado: observado ? 'OBSERVADO' : 'COMPLETO',
              fecha: observado ? null : fecha(400 - i * 5 - j),
              nroDocumento: observado ? null : `DOC-${i + 1}-${j + 1}`,
              observacion: observado ? 'No se presentó a la defensa; se reprograma (dato de prueba)' : null,
              registradoPor: kardex.id,
            },
          });
        }
        if (egresado && !bloqueado) egresados.push(f.id);
      }

      // Hojas de ruta en distintos pasos de los dos flujos, con el correlativo real (ADR-0006).
      const gestion = new Date(Date.now() - 4 * 60 * 60_000).getUTCFullYear();
      for (const [k, h] of HOJAS.entries()) {
        const tipo = tipos[h.tipo];
        const flujo = tipo.requiereValorado ? 'CON_VALORADO' : 'SIN_VALORADO';
        const [{ nro }] = await tx.$queryRaw<
          { nro: string }[]
        >`SELECT fn_siguiente_nro_hoja_ruta(${gestion}::smallint) AS nro`;
        const hoja = await tx.hojaRuta.create({
          data: {
            nroTramite: nro,
            gestion,
            fileId: egresados[k],
            tipoTramiteId: tipo.id,
            sedeActualId: sedes.LA_PAZ,
            nroValorado: tipo.requiereValorado ? String(4500 + k).padStart(6, '0') : null,
            fechaIngreso: fecha(20 - k * 2),
          },
        });
        let estado = 'RECIBIDO' as (typeof TRANSICIONES)[number]['desde'];
        let dia = 20 - k * 2;
        await tx.movimientoHojaRuta.create({
          data: {
            hojaRutaId: hoja.id,
            accion: 'REGISTRAR',
            estadoNuevo: estado,
            sedeId: sedes.LA_PAZ,
            usuarioId: usuarios.SEC_DIR.id,
            fecha: fecha(dia),
          },
        });
        for (let p = 0; p < h.pasos; p++) {
          const t = TRANSICIONES.find((x) => x.desde === estado && x.flujos.includes(flujo));
          if (!t) break;
          dia = Math.max(0, dia - 1);
          await tx.movimientoHojaRuta.create({
            data: {
              hojaRutaId: hoja.id,
              accion: t.accion,
              estadoAnterior: estado,
              estadoNuevo: t.hacia,
              sedeId: sedes[t.sede],
              usuarioId: usuarios[t.rol].id,
              fecha: fecha(dia),
            },
          });
          estado = t.hacia;
        }
      }

      return { cargados: true, personal: PERSONAL.length, files: TOTAL_FILES, hojas: HOJAS.length };
    },
    { timeout: 60_000 },
  );
}

// Uso: DATOS_PRUEBA=1 DATOS_PRUEBA_PASSWORD=… npm run bd:datos-prueba -w @siset/api
if (process.argv[1]?.endsWith('datos-prueba.ts')) {
  if (process.env.DATOS_PRUEBA !== '1') {
    // eslint-disable-next-line no-console
    console.info('Datos de prueba: omitidos (DATOS_PRUEBA no es 1).');
  } else {
    const { crearClienteBd } = await import('../src/compartido/bd');
    const bd = crearClienteBd();
    try {
      const password = process.env.DATOS_PRUEBA_PASSWORD ?? '';
      const r = await cargarDatosPrueba(bd, password);
      await asegurarEstudiantePrueba(bd);
      const cuentas = await repararCuentasPrueba(bd, password);
      // eslint-disable-next-line no-console
      console.info(
        (r.cargados
          ? `Datos de prueba cargados: ${r.personal} del personal, ${r.files} files, ${r.hojas} hojas de ruta.`
          : 'Datos de prueba: ya estaban cargados.') + ` Cuentas de prueba reparadas: ${cuentas}.`,
      );
    } finally {
      await bd.$disconnect();
    }
  }
}
