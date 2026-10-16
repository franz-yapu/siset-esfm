import type { ClienteBd, Prisma, TransaccionBd } from '@/compartido/bd';
import { ErrorConflicto, ErrorNegocio, ErrorNoEncontrado, ErrorValidacion } from '@/compartido/errores';
import { desplazamiento, obtenerContexto, type Pagina } from '@/compartido/http';
import { registrarEvento } from '@/modulos/auditoria';
import {
  actualizarFile,
  buscarFile,
  buscarIdFileDePersona,
  cambiarBloqueo,
  crearFile,
  listarFiles,
  tieneFile,
  type CambiosFile,
  type FileBd,
} from './file.repositorio';
import { buscarBloqueoAbierto, buscarPdfBloqueoAbierto, cerrarBloqueo, crearBloqueo } from './bloqueo.repositorio';
import type {
  Bloqueo,
  CambiosFileApi,
  DatosBloqueo,
  DatosCrearFile,
  FileDetalle,
  FiltrosFiles,
} from './files.esquemas';
import { listarEstadosDeFiles } from './requisito.repositorio';
import {
  entradaDelSemaforo,
  gestionesEsperadas,
  resumenDeGestiones,
  type RequisitoParaReglas,
} from './requisitos-reglas';
import { semaforoDelFile, type ColorSemaforo, type EstadoParaSemaforo } from './semaforo';

type Cliente = ClienteBd | TransaccionBd;

/** Lo que files necesita de personas; lo arma la raíz de composición (ADR-0001, SDD S2.2 §2). */
export interface PersonaFile {
  id: number;
  ci: string;
  complemento: string;
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  fechaNacimiento: Date | null;
  email: string | null;
  celular: string | null;
}

type DatosPersonales = Omit<PersonaFile, 'id'>;
type CambiosPersonales = Partial<Omit<DatosPersonales, 'ci' | 'complemento'>>;

export interface PersonasParaFiles {
  buscarPersonaPorCi(cliente: Cliente, ci: string, complemento: string): Promise<PersonaFile | null>;
  crearPersona(cliente: Cliente, datos: DatosPersonales): Promise<PersonaFile>;
  actualizarPersona(cliente: Cliente, id: number, cambios: CambiosPersonales): Promise<PersonaFile>;
  buscarIdsPorNombre(cliente: Cliente, texto: string): Promise<number[]>;
  buscarIdsPorCi(cliente: Cliente, texto: string): Promise<number[]>;
  obtenerPersonas(cliente: Cliente, ids: number[]): Promise<Map<number, PersonaFile>>;
}

/** Lo que files necesita de catalogos; también lo arma la raíz. */
export interface EspecialidadesParaFiles {
  nombreEspecialidadActiva(cliente: Cliente, id: number): Promise<string | null>;
  nombresEspecialidades(cliente: Cliente, ids: number[]): Promise<Map<number, string>>;
}

/** Lo que el semáforo necesita del catálogo de requisitos (catalogos, vía la raíz; ADR-0007). */
export interface RequisitoParaSemaforo extends RequisitoParaReglas {
  id: number;
}

export interface DependenciasFiles {
  bd: ClienteBd;
  obtenerRequisitosActivos(cliente: Cliente): Promise<RequisitoParaSemaforo[]>;
  personas: PersonasParaFiles;
  especialidades: EspecialidadesParaFiles;
  /** La persona del usuario de la sesión: seguridad, armado por la raíz (ADR-0001). */
  personaDeUsuario(usuarioId: number): Promise<number | null>;
  /** Nombre de quien bloqueó (seguridad + personas, por la raíz). */
  describirUsuarios(ids: number[]): Promise<Map<number, { usuario: string; nombre: string }>>;
}

/** El PDF de la resolución tal como llegó (ya revisado por `recibirPdfResolucion`). */
export interface PdfResolucion {
  contenido: Buffer;
  nombre: string;
}

/** El nombre del archivo, sin rutas ni caracteres de control, para la cabecera de la descarga. */
const nombrePdf = (nombre: string) => {
  const limpio = [...nombre.replace(/^.*[\\/]/, '')]
    .filter((c) => c >= ' ' && c !== '"')
    .join('')
    .trim()
    .slice(0, 120);
  return limpio || 'resolucion.pdf';
};

const CAMPOS_PERSONALES = [
  'nombres',
  'apellidoPaterno',
  'apellidoMaterno',
  'fechaNacimiento',
  'email',
  'celular',
] as const;

const aFecha = (iso: string | null): Date | null => (iso ? new Date(`${iso}T00:00:00Z`) : null);
const deFecha = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

const nombreCompleto = (p: PersonaFile) => [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');

function detalle(f: FileBd, p: PersonaFile, especialidad: string, semaforo: ColorSemaforo): FileDetalle {
  return {
    id: f.id,
    codigo: f.codigoEstudiante,
    ci: p.ci,
    complemento: p.complemento,
    nombres: p.nombres,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: p.apellidoMaterno,
    nombre: nombreCompleto(p),
    fechaNacimiento: deFecha(p.fechaNacimiento),
    celular: p.celular,
    email: p.email,
    especialidadId: f.especialidadId,
    especialidad,
    anioIngreso: f.anioIngreso,
    condicion: f.condicion,
    genero: f.genero,
    // El CHECK `ck_file_modalidad` asegura que es una de MODALIDADES.
    modalidad: f.modalidad as FileDetalle['modalidad'],
    anioFormacion: f.anioFormacion,
    bloqueado: f.bloqueado,
    motivoBloqueo: f.motivoBloqueo,
    semaforo,
  };
}

const ordenEs = new Intl.Collator('es', { sensitivity: 'base' });
const compararPorApellido = (a: PersonaFile, b: PersonaFile) =>
  ordenEs.compare(a.apellidoPaterno ?? '', b.apellidoPaterno ?? '') ||
  ordenEs.compare(a.apellidoMaterno ?? '', b.apellidoMaterno ?? '') ||
  ordenEs.compare(a.nombres, b.nombres);

const codigoExistente = () =>
  new ErrorConflicto('Ya existe un file con ese código de estudiante.', undefined, 'CODIGO_EXISTENTE');
const especialidadInexistente = () => new ErrorNegocio('La especialidad no existe.', 'ESPECIALIDAD_INEXISTENTE');

/**
 * API de files (SDD S2.2). Las rutas ya pasaron por `autorizar('files', …)`. Cada escritura deja su
 * evento en la misma transacción (DEC-007).
 */
export function crearServicioFiles({
  bd,
  personas,
  especialidades,
  obtenerRequisitosActivos,
  personaDeUsuario,
  describirUsuarios,
}: DependenciasFiles) {
  /** Semáforo de varios files: el catálogo una vez y los estados en una consulta (SDD S2.5 §2.2, ADR-0007). */
  async function semaforos(
    cliente: Cliente,
    files: Pick<FileBd, 'id' | 'bloqueado' | 'genero' | 'modalidad' | 'anioFormacion'>[],
  ): Promise<Map<number, ColorSemaforo>> {
    const catalogo = await obtenerRequisitosActivos(cliente);
    const filas = await listarEstadosDeFiles(
      cliente,
      files.map((f) => f.id),
    );
    const estadosDe = new Map<string, { gestion: string; estado: EstadoParaSemaforo }[]>();
    for (const r of filas) {
      const k = `${r.fileId}:${r.requisitoTipoId}`;
      estadosDe.set(k, [...(estadosDe.get(k) ?? []), r]);
    }
    return new Map(
      files.map((f) => {
        const { estados, atrasado } = entradaDelSemaforo(catalogo, f, (r) => {
          const registros = estadosDe.get(`${f.id}:${r.id}`) ?? [];
          return r.porGestion
            ? resumenDeGestiones(
                registros.filter((x) => x.gestion !== ''),
                gestionesEsperadas(r, f),
              )
            : (registros.find((x) => x.gestion === '')?.estado ?? 'PENDIENTE');
        });
        return [f.id, semaforoDelFile({ bloqueado: f.bloqueado, estados, atrasado })];
      }),
    );
  }

  async function cargar(cliente: Cliente, id: number) {
    const f = await buscarFile(cliente, id);
    if (!f) throw new ErrorNoEncontrado('El file no existe.');
    const p = (await personas.obtenerPersonas(cliente, [f.personaId])).get(f.personaId);
    if (!p) throw new Error(`El file ${id} no tiene persona.`);
    const nombre = (await especialidades.nombresEspecialidades(cliente, [f.especialidadId])).get(f.especialidadId);
    const semaforo = (await semaforos(cliente, [f])).get(f.id)!;
    return { f, p, d: detalle(f, p, nombre ?? '', semaforo) };
  }

  /** El código es único (DEC-016 #4): se revisa antes para dar un error claro. */
  async function exigirCodigoLibre(tx: TransaccionBd, codigo: string, exceptoId?: number) {
    const otro = await tx.fileAcademico.findUnique({ where: { codigoEstudiante: codigo }, select: { id: true } });
    if (otro && otro.id !== exceptoId) throw codigoExistente();
  }

  async function exigirEspecialidad(tx: TransaccionBd, id: number) {
    if ((await especialidades.nombreEspecialidadActiva(tx, id)) === null) throw especialidadInexistente();
  }

  return {
    async listar(filtros: FiltrosFiles): Promise<Pagina<FileDetalle>> {
      const where: Prisma.FileAcademicoWhereInput[] = [];
      if (filtros.especialidadId) where.push({ especialidadId: filtros.especialidadId });
      if (filtros.anioIngreso) where.push({ anioIngreso: filtros.anioIngreso });
      if (filtros.condicion) where.push({ condicion: filtros.condicion });
      if (filtros.bloqueado !== undefined) where.push({ bloqueado: filtros.bloqueado });
      if (filtros.texto) {
        const ids = [
          ...(await personas.buscarIdsPorNombre(bd, filtros.texto)),
          ...(await personas.buscarIdsPorCi(bd, filtros.texto)),
        ];
        where.push({
          OR: [{ codigoEstudiante: { contains: filtros.texto, mode: 'insensitive' } }, { personaId: { in: ids } }],
        });
      }
      // 152 files (D-13): se ordena en memoria por apellido, que vive en personas (§2.4).
      const files = await listarFiles(bd, { AND: where });
      const datos = await personas.obtenerPersonas(
        bd,
        files.map((f) => f.personaId),
      );
      const nombres = await especialidades.nombresEspecialidades(bd, [...new Set(files.map((f) => f.especialidadId))]);
      const colores = await semaforos(bd, files);
      const filas = files
        .filter((f) => !filtros.semaforo || colores.get(f.id) === filtros.semaforo)
        .map((f) => ({ f, p: datos.get(f.personaId)! }))
        .sort((a, b) => compararPorApellido(a.p, b.p) || a.f.id - b.f.id);
      const { skip, take } = desplazamiento(filtros);
      return {
        datos: filas
          .slice(skip, skip + take)
          .map(({ f, p }) => detalle(f, p, nombres.get(f.especialidadId) ?? '', colores.get(f.id)!)),
        pagina: filtros.pagina,
        porPagina: filtros.porPagina,
        total: filas.length,
      };
    },

    async obtener(id: number): Promise<FileDetalle> {
      return (await cargar(bd, id)).d;
    },

    /**
     * "Mi file" (S2.7, DEC-043): el id sale de la sesión, nunca de la URL, así que nadie lee otro file cambiando
     * un número ("propio" se valida en el servicio, ADR-0002).
     */
    async idPropio(): Promise<number> {
      const usuarioId = obtenerContexto()?.usuarioId;
      const personaId = usuarioId ? await personaDeUsuario(usuarioId) : null;
      const id = personaId ? await buscarIdFileDePersona(bd, personaId) : null;
      if (!id) throw new ErrorNoEncontrado('No tienes un file académico registrado. Consulta con Kardex.');
      return id;
    },

    async crear(datos: DatosCrearFile): Promise<FileDetalle> {
      const {
        codigo,
        especialidadId,
        anioIngreso,
        condicion,
        genero,
        modalidad,
        anioFormacion,
        fechaNacimiento,
        ...persona
      } = datos;
      return bd.$transaction(async (tx) => {
        const existente = await personas.buscarPersonaPorCi(tx, persona.ci, persona.complemento);
        if (existente && (await tieneFile(tx, existente.id))) {
          throw new ErrorConflicto('Esa persona ya tiene un file.', undefined, 'FILE_EXISTENTE');
        }
        await exigirCodigoLibre(tx, codigo);
        await exigirEspecialidad(tx, especialidadId);
        // Si la persona ya existe sin file (p. ej., del personal), se reutiliza sin tocar sus datos (DEC-020 #6).
        const p =
          existente ?? (await personas.crearPersona(tx, { ...persona, fechaNacimiento: aFecha(fechaNacimiento) }));
        const { id } = await crearFile(tx, {
          personaId: p.id,
          codigoEstudiante: codigo,
          especialidadId,
          anioIngreso,
          condicion,
          genero,
          modalidad,
          anioFormacion,
        });
        const { d } = await cargar(tx, id);
        await registrarEvento(tx, {
          accion: 'CREAR',
          modulo: 'FILES',
          entidad: 'file_academico',
          entidadId: id,
          despues: d,
        });
        return d;
      });
    },

    /**
     * D-29, DEC-049: Kardex bloquea por licencia temporal (obligatoria o voluntaria) con la resolución y su PDF.
     * La glosa queda también como motivo del file (la ven Secretaría y el estudiante); el PDF, solo en
     * `bloqueo_file`. La bitácora guarda los datos y el tamaño del PDF, no su contenido.
     */
    async bloquear(id: number, datos: DatosBloqueo, pdf: PdfResolucion): Promise<FileDetalle> {
      return bd.$transaction(async (tx) => {
        const { f } = await cargar(tx, id);
        if (f.bloqueado) throw new ErrorNegocio('El file ya está bloqueado.', 'ESTADO_SIN_CAMBIO');
        const pdfNombre = nombrePdf(pdf.nombre);
        await crearBloqueo(tx, {
          fileId: id,
          causa: datos.causa,
          nroResolucion: datos.nroResolucion,
          fechaResolucion: aFecha(datos.fechaResolucion)!,
          glosa: datos.glosa,
          pdf: new Uint8Array(pdf.contenido),
          pdfNombre,
          bloqueadoPor: obtenerContexto()?.usuarioId ?? null,
        });
        await cambiarBloqueo(tx, id, datos.glosa);
        await registrarEvento(tx, {
          accion: 'BLOQUEAR',
          modulo: 'FILES',
          entidad: 'file_academico',
          entidadId: id,
          antes: { bloqueado: false },
          despues: {
            bloqueado: true,
            motivo: datos.glosa,
            causa: datos.causa,
            resolucion: datos.nroResolucion,
            fechaResolucion: datos.fechaResolucion,
            pdf: { nombre: pdfNombre, bytes: pdf.contenido.length },
          },
        });
        return (await cargar(tx, id)).d;
      });
    },

    /** DEC-049 #4: el desbloqueo no pide datos; quién y cuándo quedan en `bloqueo_file` y en la bitácora. */
    async desbloquear(id: number): Promise<FileDetalle> {
      return bd.$transaction(async (tx) => {
        const { f } = await cargar(tx, id);
        if (!f.bloqueado) throw new ErrorNegocio('El file no está bloqueado.', 'ESTADO_SIN_CAMBIO');
        const abierto = await buscarBloqueoAbierto(tx, id);
        await cerrarBloqueo(tx, id, obtenerContexto()?.usuarioId ?? null);
        await cambiarBloqueo(tx, id, null);
        await registrarEvento(tx, {
          accion: 'DESBLOQUEAR',
          modulo: 'FILES',
          entidad: 'file_academico',
          entidadId: id,
          antes: { bloqueado: true, motivo: f.motivoBloqueo, resolucion: abierto?.nroResolucion ?? null },
          despues: { bloqueado: false },
        });
        return (await cargar(tx, id)).d;
      });
    },

    /**
     * El bloqueo abierto, sin el PDF. `null` si el file no está bloqueado o se bloqueó antes de DEC-049 (sin
     * resolución registrada).
     */
    async bloqueo(id: number): Promise<Bloqueo | null> {
      await cargar(bd, id);
      const b = await buscarBloqueoAbierto(bd, id);
      if (!b) return null;
      const quien =
        b.bloqueadoPor === null ? undefined : (await describirUsuarios([b.bloqueadoPor])).get(b.bloqueadoPor);
      return {
        causa: b.causa,
        nroResolucion: b.nroResolucion,
        fechaResolucion: deFecha(b.fechaResolucion)!,
        glosa: b.glosa,
        pdfNombre: b.pdfNombre,
        bloqueadoEn: b.bloqueadoEn.toISOString(),
        bloqueadoPor: b.bloqueadoPor === null ? null : { id: b.bloqueadoPor, nombre: quien?.nombre ?? '' },
      };
    },

    /** El PDF de la resolución del bloqueo abierto. */
    async pdfBloqueo(id: number): Promise<PdfResolucion> {
      await cargar(bd, id);
      const b = await buscarPdfBloqueoAbierto(bd, id);
      if (!b) throw new ErrorNoEncontrado('El file no tiene una resolución de bloqueo registrada.');
      return { contenido: Buffer.from(b.pdf), nombre: b.pdfNombre };
    },

    async editar(id: number, cambios: CambiosFileApi): Promise<FileDetalle> {
      return bd.$transaction(async (tx) => {
        const { f, p, d } = await cargar(tx, id);
        const antes: Record<string, unknown> = {};
        const despues: Record<string, unknown> = {};

        const cambiosPersona: CambiosPersonales = {};
        for (const campo of CAMPOS_PERSONALES) {
          const valor = cambios[campo];
          if (valor === undefined || valor === d[campo]) continue;
          antes[campo] = d[campo];
          despues[campo] = valor;
          Object.assign(cambiosPersona, { [campo]: campo === 'fechaNacimiento' ? aFecha(valor) : valor });
        }
        const apellidoPaterno =
          'apellidoPaterno' in cambiosPersona ? cambiosPersona.apellidoPaterno : p.apellidoPaterno;
        const apellidoMaterno =
          'apellidoMaterno' in cambiosPersona ? cambiosPersona.apellidoMaterno : p.apellidoMaterno;
        if (!apellidoPaterno && !apellidoMaterno) {
          throw new ErrorValidacion([{ ruta: 'body.apellidoPaterno', mensaje: 'Debe tener al menos un apellido' }]);
        }

        const cambiosFile: CambiosFile = {};
        if (cambios.codigo !== undefined && cambios.codigo !== f.codigoEstudiante) {
          await exigirCodigoLibre(tx, cambios.codigo, id);
          cambiosFile.codigoEstudiante = cambios.codigo;
          antes.codigo = f.codigoEstudiante;
          despues.codigo = cambios.codigo;
        }
        if (cambios.especialidadId !== undefined && cambios.especialidadId !== f.especialidadId) {
          await exigirEspecialidad(tx, cambios.especialidadId);
          cambiosFile.especialidadId = cambios.especialidadId;
          antes.especialidadId = f.especialidadId;
          despues.especialidadId = cambios.especialidadId;
        }
        for (const campo of ['anioIngreso', 'condicion', 'genero', 'modalidad', 'anioFormacion'] as const) {
          const valor = cambios[campo];
          if (valor === undefined || valor === f[campo]) continue;
          Object.assign(cambiosFile, { [campo]: valor });
          antes[campo] = f[campo];
          despues[campo] = valor;
        }

        // Nada cambió de verdad: no hay escritura ni evento.
        if (Object.keys(despues).length === 0) return d;
        if (Object.keys(cambiosPersona).length > 0) await personas.actualizarPersona(tx, p.id, cambiosPersona);
        if (Object.keys(cambiosFile).length > 0) await actualizarFile(tx, id, cambiosFile);
        await registrarEvento(tx, {
          accion: 'EDITAR',
          modulo: 'FILES',
          entidad: 'file_academico',
          entidadId: id,
          antes,
          despues,
        });
        return (await cargar(tx, id)).d;
      });
    },
  };
}

export type ServicioFiles = ReturnType<typeof crearServicioFiles>;
