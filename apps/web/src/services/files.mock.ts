import type { Usuario } from '@/types';
import type { Pagina } from '@/types/pagina';
import type {
  Bloqueo,
  CambiosFile,
  DatosBloqueo,
  DatosCrearFile,
  Especialidad,
  FileDetalle,
  FiltrosFiles,
} from '@/types/files';
import { auditar, copia, db } from '@/mocks/db';
import type { FileMock } from '@/mocks/fileMock';
import { ESPECIALIDADES } from '@/config/catalogos';
import { delay } from '@/lib/formato';
import { ErrorApi } from '@/lib/errores';
import { normalizarDatosFile, validarDatosFile } from '@/lib/files';
import { semaforoDelFile } from '@/lib/semaforo';
import { entradaSemaforoMock } from './requisitos.mock';
import { LATENCIA } from './_comun';
import type { ServicioFiles } from './files.service';

// Mock con el contrato de la API de S2.2 (SDD S2.9-S2.10 §2.1). Lee y escribe el mismo almacén que el
// prototipo (`db.files`): un file creado en P-42 aparece en las demás pantallas de la demo.

const MODULO = 'Files';

/** Ids de especialidad: el orden del catálogo, igual que el seed de la API. */
const ESPECIALIDADES_MOCK: Especialidad[] = ESPECIALIDADES.map((nombre, i) => ({ id: i + 1, nombre }));
const nombreEspecialidad = (id: number) => ESPECIALIDADES_MOCK.find((e) => e.id === id)?.nombre;
const idEspecialidad = (nombre: string) => ESPECIALIDADES_MOCK.find((e) => e.nombre === nombre)?.id ?? 0;

/** Los files del seed tienen `apellidos` en un solo texto: el primero es el paterno. */
const apellidosDe = (f: FileMock): { paterno: string | null; materno: string | null } => {
  if (f.apellidoPaterno !== undefined || f.apellidoMaterno !== undefined) {
    return { paterno: f.apellidoPaterno ?? null, materno: f.apellidoMaterno ?? null };
  }
  const [paterno, ...resto] = f.apellidos.trim().split(/\s+/);
  return { paterno: paterno || null, materno: resto.join(' ') || null };
};

export const aDetalle = (f: FileMock): FileDetalle => {
  const { paterno, materno } = apellidosDe(f);
  return {
    id: f.id,
    codigo: f.codigo,
    ci: f.ci,
    complemento: f.complemento ?? '',
    nombres: f.nombres,
    apellidoPaterno: paterno,
    apellidoMaterno: materno,
    nombre: [f.nombres, paterno, materno].filter(Boolean).join(' '),
    fechaNacimiento: f.fechaNacimiento ?? null,
    celular: f.celular ?? null,
    email: f.correo ?? null,
    especialidadId: idEspecialidad(f.especialidad),
    especialidad: f.especialidad,
    anioIngreso: f.anioIngreso,
    condicion: f.condicion,
    genero: f.genero ?? null,
    modalidad: f.modalidad ?? null,
    anioFormacion: f.anioFormacion ?? null,
    bloqueado: f.bloqueado,
    motivoBloqueo: f.motivoBloqueo ?? null,
    semaforo:
      f.condicion === 'EGRESADO' ? null : semaforoDelFile({ bloqueado: f.bloqueado, ...entradaSemaforoMock(f.id) }),
  };
};

/** Como el CHECK `ck_bloqueo_pdf` de la API. */
const PDF_MAX_BYTES = 5 * 1024 * 1024;
const HOY_LA_PAZ = () => new Date(Date.now() - 4 * 60 * 60_000).toISOString().slice(0, 10);

/** El bloqueo abierto de cada file con su PDF: solo en memoria (la demo no guarda archivos). */
const bloqueos = new Map<number, { bloqueo: Bloqueo; pdf: Blob }>();

const noEncontrado = () => new ErrorApi('El file no existe.', 'NO_ENCONTRADO', 404);
const conflicto = (mensaje: string, codigo: string) => new ErrorApi(mensaje, codigo, 409);
const validacion = (detalles: { ruta: string; mensaje: string }[]) =>
  new ErrorApi('Los datos enviados no son válidos.', 'VALIDACION', 400, detalles);

const buscar = (id: number): FileMock => {
  const f = db.files.find((x) => x.id === id);
  if (!f) throw noEncontrado();
  return f;
};

const exigirValidos = (d: DatosCrearFile, creando: boolean) => {
  const errores = Object.entries(validarDatosFile(d, creando)).map(([campo, mensaje]) => ({
    ruta: `body.${campo}`,
    mensaje,
  }));
  if (errores.length) throw validacion(errores);
};

const exigirCodigoLibre = (codigo: string, exceptoId?: number) => {
  if (db.files.some((f) => f.codigo === codigo && f.id !== exceptoId)) {
    throw conflicto('Ya existe un file con ese código de estudiante.', 'CODIGO_EXISTENTE');
  }
};

const exigirEspecialidad = (id: number): string => {
  const nombre = nombreEspecialidad(id);
  if (!nombre) throw new ErrorApi('La especialidad no existe.', 'ESPECIALIDAD_INEXISTENTE', 422);
  return nombre;
};

/** Aplica los datos del contrato al file del prototipo (y mantiene `apellidos` para las otras pantallas). */
const aplicar = (f: FileMock, d: Partial<DatosCrearFile>) => {
  if (d.nombres !== undefined) f.nombres = d.nombres;
  if (d.apellidoPaterno !== undefined || d.apellidoMaterno !== undefined) {
    const actual = apellidosDe(f);
    f.apellidoPaterno = d.apellidoPaterno !== undefined ? d.apellidoPaterno : actual.paterno;
    f.apellidoMaterno = d.apellidoMaterno !== undefined ? d.apellidoMaterno : actual.materno;
    f.apellidos = [f.apellidoPaterno, f.apellidoMaterno].filter(Boolean).join(' ');
  }
  if (d.fechaNacimiento !== undefined) f.fechaNacimiento = d.fechaNacimiento ?? undefined;
  if (d.celular !== undefined) f.celular = d.celular ?? undefined;
  if (d.email !== undefined) f.correo = d.email ?? undefined;
  if (d.codigo !== undefined) f.codigo = d.codigo;
  if (d.especialidadId !== undefined) f.especialidad = exigirEspecialidad(d.especialidadId);
  if (d.anioIngreso !== undefined) f.anioIngreso = d.anioIngreso;
  if (d.condicion !== undefined) f.condicion = d.condicion;
  if (d.genero !== undefined) f.genero = d.genero;
  if (d.modalidad !== undefined && d.modalidad !== f.modalidad) {
    // Como la API: una modalidad nueva tiene que estar activa en el catálogo (DEC-058); la que ya tenía se conserva.
    if (d.modalidad !== null && !db.modalidades.some((m) => m.codigo === d.modalidad && m.activo)) {
      throw new ErrorApi(`La modalidad ${d.modalidad} no existe o está dada de baja.`, 'MODALIDAD_INEXISTENTE', 422);
    }
    f.modalidad = d.modalidad;
  }
  if (d.anioFormacion !== undefined) f.anioFormacion = d.anioFormacion;
};

export const filesMock: ServicioFiles = {
  async listar(f: FiltrosFiles): Promise<Pagina<FileDetalle>> {
    await delay(LATENCIA);
    const pagina = f.pagina ?? 1;
    const porPagina = f.porPagina ?? 50;
    const t = f.texto?.trim().toLowerCase();
    const filas = db.files
      .map(aDetalle)
      .filter(
        (d) =>
          (!t || [d.ci, d.codigo, d.nombre].some((v) => v.toLowerCase().includes(t))) &&
          (!f.especialidadId || d.especialidadId === f.especialidadId) &&
          (!f.anioIngreso || d.anioIngreso === f.anioIngreso) &&
          (!f.condicion || d.condicion === f.condicion) &&
          (f.bloqueado === undefined || d.bloqueado === f.bloqueado) &&
          (!f.semaforo || d.semaforo === f.semaforo),
      )
      .sort(
        (a, b) =>
          (a.apellidoPaterno ?? '').localeCompare(b.apellidoPaterno ?? '', 'es') ||
          (a.apellidoMaterno ?? '').localeCompare(b.apellidoMaterno ?? '', 'es') ||
          a.nombres.localeCompare(b.nombres, 'es') ||
          a.id - b.id,
      );
    const desde = (pagina - 1) * porPagina;
    return { datos: filas.slice(desde, desde + porPagina), pagina, porPagina, total: filas.length };
  },

  async obtener(id: number): Promise<FileDetalle> {
    await delay(LATENCIA);
    return aDetalle(buscar(id));
  },

  async mio(actor: Usuario): Promise<FileDetalle> {
    await delay(LATENCIA);
    const f = db.files.find((x) => x.id === actor.fileId);
    if (!f) throw new ErrorApi('No tienes un file académico registrado. Consulta con Kardex.', 'NO_ENCONTRADO', 404);
    return aDetalle(f);
  },

  async crear(datos: DatosCrearFile, actor: Usuario): Promise<FileDetalle> {
    await delay(LATENCIA);
    const d = normalizarDatosFile(datos);
    exigirValidos(d, true);
    if (db.files.some((f) => f.ci === d.ci && (f.complemento ?? '') === d.complemento)) {
      throw conflicto('Esa persona ya tiene un file.', 'FILE_EXISTENTE');
    }
    exigirCodigoLibre(d.codigo);
    const nuevo: FileMock = {
      id: Math.max(0, ...db.files.map((f) => f.id)) + 1,
      ci: d.ci,
      complemento: d.complemento,
      nombres: d.nombres,
      apellidos: '',
      codigo: d.codigo,
      especialidad: exigirEspecialidad(d.especialidadId),
      anioIngreso: d.anioIngreso,
      condicion: d.condicion,
      bloqueado: false,
      matriculas: [],
      resultados: [],
      requisitos: {
        TACFI: { estado: 'PENDIENTE' },
        TCLO: { estado: 'PENDIENTE' },
        CERT_NOTAS: { estado: 'PENDIENTE' },
      },
    };
    aplicar(nuevo, d);
    db.files.push(nuevo);
    const detalle = aDetalle(nuevo);
    auditar(actor.nombre, MODULO, 'Crear file', nuevo.codigo, null, { ...detalle });
    return copia(detalle);
  },

  async editar(id: number, cambios: CambiosFile, actor: Usuario): Promise<FileDetalle> {
    await delay(LATENCIA);
    const f = buscar(id);
    if ('ci' in cambios || 'complemento' in cambios || 'bloqueado' in cambios) {
      throw validacion([{ ruta: 'body', mensaje: 'El CI y el bloqueo no se editan aquí' }]);
    }
    const antes = aDetalle(f);
    const final = normalizarDatosFile({ ...antes, ...cambios });
    exigirValidos(final, false);
    if (cambios.codigo !== undefined) exigirCodigoLibre(final.codigo, id);
    const previo: Record<string, unknown> = {};
    const nuevo: Record<string, unknown> = {};
    for (const k of Object.keys(cambios) as (keyof CambiosFile)[]) {
      if (antes[k] !== final[k]) {
        previo[k] = antes[k];
        nuevo[k] = final[k];
      }
    }
    if (Object.keys(nuevo).length === 0) return antes;
    aplicar(f, final);
    auditar(actor.nombre, MODULO, 'Editar file', f.codigo, previo, nuevo);
    return aDetalle(f);
  },

  async bloquear(id: number, d: DatosBloqueo, actor: Usuario): Promise<FileDetalle> {
    await delay(LATENCIA);
    const f = buscar(id);
    const nro = d.nroResolucion.trim();
    const glosa = d.glosa.trim();
    const problemas: { ruta: string; mensaje: string }[] = [];
    if (d.causa !== 'LICENCIA_OBLIGATORIA' && d.causa !== 'LICENCIA_VOLUNTARIA')
      problemas.push({ ruta: 'body.causa', mensaje: 'Elija la causa del bloqueo' });
    if (!nro) problemas.push({ ruta: 'body.nroResolucion', mensaje: 'Escriba el número de la resolución' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fechaResolucion))
      problemas.push({ ruta: 'body.fechaResolucion', mensaje: 'Fecha con formato AAAA-MM-DD' });
    else if (d.fechaResolucion > HOY_LA_PAZ())
      problemas.push({ ruta: 'body.fechaResolucion', mensaje: 'La fecha de la resolución no puede ser futura' });
    if (glosa.length < 5) problemas.push({ ruta: 'body.glosa', mensaje: 'Escriba la glosa con el motivo' });
    if (problemas.length) throw validacion(problemas);
    if (d.pdf.size === 0 || !/\.pdf$/i.test(d.pdf.name))
      throw validacion([{ ruta: 'body.pdf', mensaje: 'El archivo no es un PDF' }]);
    if (d.pdf.size > PDF_MAX_BYTES) throw validacion([{ ruta: 'body.pdf', mensaje: 'El PDF pesa más de 5 MB' }]);
    if (f.bloqueado) throw new ErrorApi('El file ya está bloqueado.', 'ESTADO_SIN_CAMBIO', 422);
    f.bloqueado = true;
    f.motivoBloqueo = glosa;
    bloqueos.set(id, {
      bloqueo: {
        causa: d.causa,
        nroResolucion: nro,
        fechaResolucion: d.fechaResolucion,
        glosa,
        pdfNombre: d.pdf.name,
        bloqueadoEn: new Date().toISOString(),
        bloqueadoPor: { id: actor.id, nombre: actor.nombre },
      },
      pdf: d.pdf,
    });
    auditar(
      actor.nombre,
      MODULO,
      'Bloquear file',
      f.codigo,
      { bloqueado: false },
      { bloqueado: true, motivo: glosa, causa: d.causa, resolucion: nro, fechaResolucion: d.fechaResolucion },
    );
    return aDetalle(f);
  },

  async desbloquear(id: number, actor: Usuario): Promise<FileDetalle> {
    await delay(LATENCIA);
    const f = buscar(id);
    if (!f.bloqueado) throw new ErrorApi('El file no está bloqueado.', 'ESTADO_SIN_CAMBIO', 422);
    const antes = {
      bloqueado: true,
      motivo: f.motivoBloqueo ?? null,
      resolucion: bloqueos.get(id)?.bloqueo.nroResolucion ?? null,
    };
    f.bloqueado = false;
    f.motivoBloqueo = undefined;
    bloqueos.delete(id);
    auditar(actor.nombre, MODULO, 'Desbloquear file', f.codigo, antes, { bloqueado: false });
    return aDetalle(f);
  },

  async bloqueo(id: number): Promise<Bloqueo | null> {
    await delay(LATENCIA);
    buscar(id);
    const b = bloqueos.get(id);
    return b ? copia(b.bloqueo) : null;
  },

  async pdfBloqueo(id: number): Promise<Blob> {
    await delay(LATENCIA);
    buscar(id);
    const b = bloqueos.get(id);
    if (!b) throw new ErrorApi('El file no tiene una resolución de bloqueo registrada.', 'NO_ENCONTRADO', 404);
    return b.pdf;
  },

  async especialidades(): Promise<Especialidad[]> {
    await delay(LATENCIA);
    return copia(ESPECIALIDADES_MOCK);
  },
};
