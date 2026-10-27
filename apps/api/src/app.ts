import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import type { ClienteBd } from '@/compartido/bd';
import type { Config } from '@/compartido/config';
import { crearManejadorErrores, rutaNoEncontrada } from '@/compartido/errores';
import {
  crearDocumentoOpenApi,
  middlewareContexto,
  obtenerContexto,
  routerDocs,
  type ModuloHttp,
} from '@/compartido/http';
import { crearLogger } from '@/compartido/logger';
import {
  crearModuloCatalogos,
  leerParametrosEnteros,
  modalidadActiva,
  nombreEspecialidadActiva,
  nombresEspecialidades,
  obtenerRequisitosActivos,
  obtenerSedes,
  obtenerTiposTramite,
} from '@/modulos/catalogos';
import {
  crearModuloFiles,
  RUTA_IMPORTACION_FILES,
  datosBasicosFile,
  egresadosDePersonas,
  fileIdsDePersonas,
  personasDeFiles,
} from '@/modulos/files';
import { crearModuloHojasRuta } from '@/modulos/hojas-ruta';
import {
  actualizarPersona,
  borrarFoto,
  buscarIdsPorCi,
  buscarIdsPorNombre,
  buscarNombreCompleto,
  buscarNombresCompletos,
  buscarPersonaPorCi,
  crearPersona,
  fechasDeFotos,
  guardarFoto,
  leerFoto,
  obtenerPersonas,
} from '@/modulos/personas';
import { crearModuloAuditoria } from '@/modulos/auditoria';
import { crearModuloSalud } from '@/modulos/salud';
import {
  asegurarCuentaEstudiante,
  crearAutenticar,
  crearAutorizar,
  desactivarCuentaEstudiante,
  hashInicialEstudiante,
  crearModuloAuth,
  crearModuloUsuarios,
  describirUsuarios,
  sesionDe,
} from '@/modulos/seguridad';

export interface DependenciasApp {
  bd: ClienteBd;
  config: Config;
  logger?: Logger;
  version?: string;
  /** Solo para tests: módulos extra montados bajo /api/v1. */
  modulosExtra?: ModuloHttp[];
}

/**
 * Raíz de composición (ADR-0001, SDD S0.7 §2): el único lugar que conoce a todos
 * los módulos y les inyecta sus dependencias.
 */
export function crearApp({
  bd,
  config,
  logger = crearLogger(config),
  version = '0.0.0',
  modulosExtra = [],
}: DependenciasApp): Express {
  const app = express();
  app.set('trust proxy', config.trustProxy);

  app.use(middlewareContexto);
  app.use(pinoHttp({ logger, genReqId: () => obtenerContexto()?.idPeticion ?? randomUUID() }));
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigen, credentials: true }));
  // La importación de files trae su propio límite, mayor, y lo aplica después de autenticar (DEC-064 #3).
  const json = express.json({ limit: config.jsonLimite });
  app.use((req, res, next) => (req.path === RUTA_IMPORTACION_FILES ? next() : json(req, res, next)));
  app.use(cookieParser()); // la cookie del refresh (SDD S1.5 §2.5)

  const autenticar = crearAutenticar(config.jwtSecreto);
  const autorizar = crearAutorizar();
  // La raíz une seguridad y personas para la bitácora: auditoria no importa a ninguno (ADR-0001).
  const describir = async (ids: number[]) => {
    const usuarios = await describirUsuarios(bd, ids);
    const nombres = await buscarNombresCompletos(
      bd,
      usuarios.map((u) => u.personaId),
    );
    return new Map(usuarios.map((u) => [u.id, { usuario: u.username, nombre: nombres.get(u.personaId) ?? '' }]));
  };

  const modulos: ModuloHttp[] = [
    crearModuloSalud({ bd, version }),
    // La raíz une seguridad con personas: seguridad no importa a personas (SDD S1.3 §2.4).
    crearModuloAuth({
      bd,
      jwtSecreto: config.jwtSecreto,
      nombreDe: buscarNombreCompleto,
      leerParametros: leerParametrosEnteros,
      loginLimitePorMinuto: config.loginLimitePorMinuto,
      captchaTrasFallos: config.captchaTrasFallos,
    }),
    // Crear un usuario crea su persona en la misma transacción: la raíz pasa personas (SDD S1.8 §2.4).
    crearModuloUsuarios({
      bd,
      autenticar,
      autorizar,
      personas: { buscarPersonaPorCi, crearPersona, actualizarPersona, buscarIdsPorNombre, obtenerPersonas },
    }),
    // El file crea su persona en la misma transacción; la especialidad sale de catalogos (SDD S2.2 §2).
    crearModuloFiles({
      bd,
      // La cuenta del estudiante nace con su file (DEC-064 #4); files no importa seguridad (ADR-0001).
      cuentas: {
        hashInicial: hashInicialEstudiante,
        asegurar: asegurarCuentaEstudiante,
        desactivar: desactivarCuentaEstudiante,
      },
      autenticar,
      autorizar: {
        leer: autorizar('files', 'leer'),
        leerPropio: autorizar('files', 'leer_propio'),
        editarPropio: autorizar('files', 'editar_propio'),
        crear: autorizar('files', 'crear'),
        editar: autorizar('files', 'editar'),
      },
      personas: {
        buscarPersonaPorCi,
        crearPersona,
        actualizarPersona,
        buscarIdsPorNombre,
        buscarIdsPorCi,
        obtenerPersonas,
        fechasDeFotos,
        leerFoto,
        guardarFoto,
        borrarFoto,
      },
      especialidades: { nombreEspecialidadActiva, nombresEspecialidades, modalidadActiva },
      // Requisitos del file (SDD S2.4): el catálogo es de catalogos; quién registró, de seguridad + personas.
      autorizarRequisitos: {
        leer: autorizar('requisitos', 'leer'),
        leerPropio: autorizar('requisitos', 'leer_propio'),
        editar: autorizar('requisitos', 'editar'),
      },
      // "Mi file" (S2.7): la persona del usuario de la sesión sale de seguridad.
      personaDeUsuario: async (id) => (await describirUsuarios(bd, [id]))[0]?.personaId ?? null,
      obtenerRequisitosActivos,
      describirUsuarios: describir,
    }),
    crearModuloCatalogos({
      bd,
      autenticar,
      autorizarLectura: autorizar('files', 'leer'),
      autorizarRequisitos: autorizar('requisitos', 'leer'),
      autorizarAdminRequisitos: { crear: autorizar('requisitos', 'crear'), editar: autorizar('requisitos', 'editar') },
    }),
    // Hojas de ruta (SDD S3.1-S3.3): el titular sale de files + personas; tipos y sedes, de catalogos.
    crearModuloHojasRuta({
      bd,
      autenticar,
      autorizarLectura: autorizar('hojas-ruta', 'leer'),
      autorizarIngesta: autorizar('hojas-ruta', 'crear'),
      seguimientoLimitePorMinuto: config.loginLimitePorMinuto,
      autorizarReportes: autorizar('reportes', 'leer'),
      sesionDe: (res) => {
        const { usuarioId, rol, sedeId } = sesionDe(res);
        return { usuarioId, rol, sedeId };
      },
      obtenerTiposTramite,
      obtenerSedes,
      titularDeFile: async (cliente, fileId) => {
        const f = await datosBasicosFile(cliente, fileId);
        if (!f) return null;
        const p = (await obtenerPersonas(cliente, [f.personaId])).get(f.personaId);
        if (!p) return null;
        const nombre = [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
        return {
          nombre,
          ci: p.complemento ? `${p.ci}-${p.complemento}` : p.ci,
          bloqueado: f.bloqueado,
          condicion: f.condicion,
        };
      },
      titularesDeFiles: async (cliente, fileIds) => {
        const files = await personasDeFiles(cliente, fileIds);
        const personas = await obtenerPersonas(
          cliente,
          files.map((f) => f.personaId),
        );
        return new Map(
          files.map((f) => {
            const p = personas.get(f.personaId)!;
            const nombre = [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
            return [f.id, { nombre, ci: p.complemento ? `${p.ci}-${p.complemento}` : p.ci }];
          }),
        );
      },
      buscarFileIdsPorTitular: async (cliente, texto) => {
        const ids = [...(await buscarIdsPorNombre(cliente, texto)), ...(await buscarIdsPorCi(cliente, texto))];
        return fileIdsDePersonas(cliente, [...new Set(ids)]);
      },
      buscarTitularesEgresados: async (cliente, texto) => {
        const ids = [...(await buscarIdsPorCi(cliente, texto)), ...(await buscarIdsPorNombre(cliente, texto))];
        const files = await egresadosDePersonas(cliente, [...new Set(ids)]);
        const personas = await obtenerPersonas(
          cliente,
          files.map((f) => f.personaId),
        );
        const especialidades = await nombresEspecialidades(
          cliente,
          files.map((f) => f.especialidadId),
        );
        return files.map((f) => {
          const p = personas.get(f.personaId)!;
          return {
            fileId: f.id,
            nombre: [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' '),
            ci: p.complemento ? `${p.ci}-${p.complemento}` : p.ci,
            especialidad: especialidades.get(f.especialidadId) ?? '',
            bloqueado: f.bloqueado,
            motivoBloqueo: f.motivoBloqueo,
          };
        });
      },
      describirUsuarios: describir,
    }),
    crearModuloAuditoria({
      bd,
      autenticar,
      autorizarLectura: autorizar('auditoria', 'leer'),
      describirUsuarios: describir,
    }),
    ...modulosExtra,
  ];
  const api = Router();
  for (const m of modulos) api.use(m.router);
  if (config.entorno !== 'production') {
    api.use(
      routerDocs(
        crearDocumentoOpenApi(
          modulos.map((m) => m.openapi),
          version,
        ),
      ),
    );
  }
  app.use('/api/v1', api);

  app.use(rutaNoEncontrada);
  app.use(crearManejadorErrores(logger));
  return app;
}
