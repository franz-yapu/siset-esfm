import type {
  CodigoRequisito,
  ColorSemaforo,
  FileAcademico,
  Matricula,
  Requisito,
  ResultadoAnual,
  Usuario,
} from '@/types';
import { auditar, copia, db } from '@/mocks/db';
import { ESPECIALIDADES } from '@/config/catalogos';
import { delay } from '@/lib/formato';
import { ErrorNegocio } from '@/lib/transiciones';
import { motivoBloqueoPorUf, NOMBRE_REQUISITO, nombreCompleto, semaforoFile, superaLimite } from '@/lib/reglas';
import { LATENCIA } from './_comun';

export interface FiltrosFiles {
  texto?: string;
  especialidad?: string;
  anio?: number;
  semaforo?: ColorSemaforo | '';
  soloBloqueados?: boolean;
}

export type DatosFile = Pick<
  FileAcademico,
  | 'ci'
  | 'nombres'
  | 'apellidos'
  | 'codigo'
  | 'especialidad'
  | 'anioIngreso'
  | 'condicion'
  | 'fechaNacimiento'
  | 'celular'
  | 'correo'
>;

const buscar = (id: number): FileAcademico => {
  const f = db.files.find((x) => x.id === id);
  if (!f) throw new ErrorNegocio('File no encontrado');
  return f;
};

export const filesService = {
  especialidades: (): string[] => [...ESPECIALIDADES],

  async listar(filtros: FiltrosFiles = {}): Promise<FileAcademico[]> {
    await delay(LATENCIA);
    const t = filtros.texto?.toLowerCase().trim();
    return copia(
      db.files.filter(
        (f) =>
          (!t || [f.ci, f.codigo, nombreCompleto(f)].some((v) => v.toLowerCase().includes(t))) &&
          (!filtros.especialidad || f.especialidad === filtros.especialidad) &&
          (!filtros.anio || (f.matriculas.at(-1)?.anio ?? 0) === filtros.anio) &&
          (!filtros.semaforo || semaforoFile(f) === filtros.semaforo) &&
          (!filtros.soloBloqueados || f.bloqueado),
      ),
    );
  },

  async obtener(id: number): Promise<FileAcademico> {
    await delay(LATENCIA);
    return copia(buscar(id));
  },

  /** RF-04 / RF-02 CA3: el estudiante o egresado solo obtiene SU file. */
  async miFile(u: Usuario): Promise<FileAcademico> {
    await delay(LATENCIA);
    if (!u.fileId) throw new ErrorNegocio('Tu usuario no tiene file asociado');
    return copia(buscar(u.fileId));
  },

  /** Autocompletado por CI para la ingesta (P-30). */
  async buscarPorCi(ci: string): Promise<FileAcademico[]> {
    await delay(150);
    const t = ci.trim();
    if (t.length < 2) return [];
    return copia(
      db.files
        .filter((f) => f.ci.startsWith(t) || nombreCompleto(f).toLowerCase().includes(t.toLowerCase()))
        .slice(0, 6),
    );
  },

  async crear(datos: DatosFile, crearCuenta: boolean, u: Usuario): Promise<FileAcademico> {
    await delay(LATENCIA);
    if (db.files.some((f) => f.ci === datos.ci)) throw new ErrorNegocio('Ya existe un file con ese CI');
    if (db.files.some((f) => f.codigo === datos.codigo)) throw new ErrorNegocio('El código de estudiante ya existe');
    const nuevo: FileAcademico = {
      ...datos,
      id: Math.max(...db.files.map((f) => f.id)) + 1,
      bloqueado: false,
      matriculas: [],
      resultados: [],
      requisitos: {
        TACFI: { estado: 'PENDIENTE' },
        TCLO: { estado: 'PENDIENTE' },
        CERT_NOTAS: { estado: 'PENDIENTE' },
      },
    };
    db.files.push(nuevo);
    auditar(u.nombre, 'Files', 'Crear file', nuevo.codigo, null, { ...datos });
    if (crearCuenta && !db.usuarios.some((x) => x.usuario === datos.ci)) {
      db.usuarios.push({
        id: Math.max(...db.usuarios.map((x) => x.id)) + 1,
        usuario: datos.ci,
        nombre: nombreCompleto(datos),
        rol: datos.condicion,
        sedeId: null,
        activo: true,
        fileId: nuevo.id,
        debeCambiarClave: true,
        correo: datos.correo,
      });
      auditar(u.nombre, 'Usuarios', 'Crear cuenta de acceso', datos.ci, null, { rol: datos.condicion });
    }
    return copia(nuevo);
  },

  async editar(id: number, datos: DatosFile, u: Usuario): Promise<FileAcademico> {
    await delay(LATENCIA);
    const f = buscar(id);
    if (db.files.some((x) => x.ci === datos.ci && x.id !== id)) throw new ErrorNegocio('Ya existe un file con ese CI');
    const antes: Record<string, unknown> = {};
    const despues: Record<string, unknown> = {};
    for (const k of Object.keys(datos) as (keyof DatosFile)[]) {
      if (f[k] !== datos[k]) {
        antes[k] = f[k];
        despues[k] = datos[k];
      }
    }
    Object.assign(f, datos);
    auditar(u.nombre, 'Files', 'Editar datos personales', f.codigo, antes, despues);
    return copia(f);
  },

  async registrarMatricula(id: number, m: Matricula, u: Usuario): Promise<FileAcademico> {
    await delay(LATENCIA);
    const f = buscar(id);
    if (f.matriculas.some((x) => x.anio === m.anio)) throw new ErrorNegocio(`Ya hay matrícula para ${m.anio}.º año`);
    f.matriculas.forEach((x) => {
      x.estado = 'Concluida';
    });
    f.matriculas.push(m);
    f.matriculas.sort((a, b) => a.anio - b.anio);
    auditar(u.nombre, 'Files', 'Registrar matrícula', f.codigo, null, { ...m });
    return copia(f);
  },

  /** RF-07: si supera el límite de UF, el file queda bloqueado automáticamente. */
  async registrarResultado(id: number, r: ResultadoAnual, u: Usuario): Promise<FileAcademico> {
    await delay(LATENCIA);
    const f = buscar(id);
    const previo = f.resultados.find((x) => x.anio === r.anio);
    const antes = { resultado: previo ? { ...previo } : null, bloqueado: f.bloqueado };
    f.resultados = [...f.resultados.filter((x) => x.anio !== r.anio), r].sort((a, b) => a.anio - b.anio);
    if (superaLimite(r) && !f.bloqueado) {
      f.bloqueado = true;
      f.motivoBloqueo = motivoBloqueoPorUf(r);
    }
    auditar(u.nombre, 'Files', 'Registrar resultado anual', f.codigo, antes, {
      resultado: { ...r },
      bloqueado: f.bloqueado,
    });
    return copia(f);
  },

  /** RF-05 / RF-06: TACFI (recepción física), TCLO (nivel + N.º), certificado de notas. */
  async registrarRequisito(id: number, codigo: CodigoRequisito, datos: Requisito, u: Usuario): Promise<FileAcademico> {
    await delay(LATENCIA);
    const f = buscar(id);
    const antes = { ...f.requisitos[codigo] };
    f.requisitos[codigo] = { ...datos, estado: 'COMPLETO' };
    auditar(u.nombre, 'Files', `Registrar ${NOMBRE_REQUISITO[codigo]}`, f.codigo, antes, { ...f.requisitos[codigo] });
    return copia(f);
  },

  /** RF-07 CA3: bloquear o desbloquear siempre exige motivo y queda en bitácora. */
  async cambiarBloqueo(id: number, bloquear: boolean, motivo: string, u: Usuario): Promise<FileAcademico> {
    await delay(LATENCIA);
    if (!motivo.trim()) throw new ErrorNegocio('El motivo es obligatorio');
    const f = buscar(id);
    const antes = { bloqueado: f.bloqueado, motivo: f.motivoBloqueo ?? null };
    f.bloqueado = bloquear;
    f.motivoBloqueo = bloquear ? motivo.trim() : undefined;
    auditar(u.nombre, 'Files', bloquear ? 'Bloquear file' : 'Desbloquear file', f.codigo, antes, {
      bloqueado: bloquear,
      motivo: motivo.trim(),
    });
    return copia(f);
  },

  /** Mini bitácora del file (pestaña Historial de P-41). */
  async historial(id: number) {
    await delay(LATENCIA);
    const f = buscar(id);
    return copia(db.bitacora.filter((b) => b.registro === f.codigo).reverse());
  },

  /** Carga masiva (P-46): simulada con filas fijas; importa solo las válidas. */
  async importar(
    filas: (DatosFile & { error?: string })[],
    u: Usuario,
  ): Promise<{ importados: number; errores: number }> {
    await delay(800);
    let importados = 0;
    for (const fila of filas.filter((x) => !x.error)) {
      if (db.files.some((f) => f.ci === fila.ci)) continue;
      const { error: _e, ...datos } = fila;
      db.files.push({
        ...datos,
        id: Math.max(...db.files.map((f) => f.id)) + 1,
        bloqueado: false,
        matriculas: [],
        resultados: [],
        requisitos: {
          TACFI: { estado: 'PENDIENTE' },
          TCLO: { estado: 'PENDIENTE' },
          CERT_NOTAS: { estado: 'PENDIENTE' },
        },
      });
      importados++;
    }
    const errores = filas.length - importados;
    auditar(u.nombre, 'Files', 'Carga masiva de files', `${importados} filas`, null, { importados, errores });
    return { importados, errores };
  },
};
