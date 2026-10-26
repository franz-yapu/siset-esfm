import type { CondicionFile, DatosCrearFile, Genero, Modalidad } from '@/types/files';
import type { CampoFile } from './files';

// Importación de files desde Excel (DEC-064 #3): las columnas son los campos de "Nuevo file". La web lee el Excel y
// traduce lo que una persona escribe (fechas, especialidad por nombre, "Estudiante") al contrato de la API; las reglas
// de cada campo las revisa la API.

export interface ColumnaImportacion {
  titulo: string;
  campo: CampoFile;
  regla: string;
  ejemplo: string | number;
  obligatoria: boolean;
}

export const COLUMNAS_IMPORTACION: readonly ColumnaImportacion[] = [
  { titulo: 'CI', campo: 'ci', regla: 'Solo números, de 4 a 15', ejemplo: '8100101', obligatoria: true },
  {
    titulo: 'Complemento',
    campo: 'complemento',
    regla: 'Si lo tiene, hasta 5 letras o dígitos',
    ejemplo: '',
    obligatoria: false,
  },
  {
    titulo: 'Código de estudiante',
    campo: 'codigo',
    regla: 'Único, como en la matrícula',
    ejemplo: '209-RQM15030400',
    obligatoria: true,
  },
  { titulo: 'Nombres', campo: 'nombres', regla: 'Obligatorio', ejemplo: 'Rosa', obligatoria: true },
  {
    titulo: 'Apellido paterno',
    campo: 'apellidoPaterno',
    regla: 'Al menos un apellido',
    ejemplo: 'Quispe',
    obligatoria: false,
  },
  {
    titulo: 'Apellido materno',
    campo: 'apellidoMaterno',
    regla: 'Al menos un apellido',
    ejemplo: 'Mamani',
    obligatoria: false,
  },
  {
    titulo: 'Fecha de nacimiento',
    campo: 'fechaNacimiento',
    regla: 'dd/mm/aaaa. Obligatoria para estudiantes: es su contraseña inicial',
    ejemplo: '15/03/2004',
    obligatoria: false,
  },
  { titulo: 'Celular', campo: 'celular', regla: 'Opcional', ejemplo: '71234567', obligatoria: false },
  { titulo: 'Correo', campo: 'email', regla: 'Opcional', ejemplo: '', obligatoria: false },
  {
    titulo: 'Especialidad',
    campo: 'especialidadId',
    regla: 'Como en la hoja «Especialidades»',
    ejemplo: 'Matemática',
    obligatoria: true,
  },
  { titulo: 'Año de ingreso', campo: 'anioIngreso', regla: 'Cuatro cifras', ejemplo: 2024, obligatoria: true },
  {
    titulo: 'Condición',
    campo: 'condicion',
    regla: 'Estudiante o Egresado',
    ejemplo: 'Estudiante',
    obligatoria: false,
  },
  { titulo: 'Género', campo: 'genero', regla: 'Femenino o Masculino', ejemplo: 'Femenino', obligatoria: false },
  {
    titulo: 'Modalidad de ingreso',
    campo: 'modalidad',
    regla: 'A, B1, B2 o B3. Obligatoria para estudiantes',
    ejemplo: 'A',
    obligatoria: false,
  },
  { titulo: 'Año de formación', campo: 'anioFormacion', regla: 'De 1 a 5, si cursa', ejemplo: 3, obligatoria: false },
];

export interface ErrorDeCampo {
  campo: string;
  mensaje: string;
}

export interface FilaLeida {
  /** La fila en el Excel (la 1 es el encabezado). */
  filaExcel: number;
  datos: DatosCrearFile;
  /** Lo que no se pudo traducir; la API revisa el resto. */
  errores: ErrorDeCampo[];
}

export type Celda = string | number | boolean | Date | null | undefined;

/** Sin tildes, en minúsculas y sin espacios de más: así "Matemática " y "matematica" son la misma. */
export const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const texto = (v: Celda): string => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

const dosCifras = (n: number) => String(n).padStart(2, '0');

/** Una celda de fecha de Excel, o texto dd/mm/aaaa, dd-mm-aaaa o aaaa-mm-dd → AAAA-MM-DD; null si está vacía. */
export function leerFecha(v: Celda): string | null | undefined {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime())
      ? undefined
      : `${v.getUTCFullYear()}-${dosCifras(v.getUTCMonth() + 1)}-${dosCifras(v.getUTCDate())}`;
  }
  const t = texto(v);
  if (!t) return null;
  const dma = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  const amd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const [d, m, a] = dma ? [dma[1], dma[2], dma[3]] : amd ? [amd[3], amd[2], amd[1]] : [];
  if (!a) return undefined;
  const iso = `${a}-${dosCifras(Number(m))}-${dosCifras(Number(d))}`;
  const f = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(f.getTime()) && f.toISOString().slice(0, 10) === iso ? iso : undefined;
}

/** "3", 3, "3.0" o "3.º" → 3; null si está vacía; undefined si no es un número entero. */
const entero = (v: Celda): number | null | undefined => {
  const t = texto(v);
  if (!t) return null;
  const m = /^(\d+)(?:[.,]0+)?\s*\.?[º°]?$/.exec(t);
  return m ? Number(m[1]) : undefined;
};

/**
 * Lee la primera hoja: la fila 1 es el encabezado (en cualquier orden; se reconoce sin tildes ni mayúsculas) y cada
 * fila no vacía es un file. Devuelve un error general si faltan columnas obligatorias.
 */
export function leerFilas(
  hoja: readonly (readonly Celda[])[],
  especialidades: readonly { id: number; nombre: string }[],
): { filas: FilaLeida[]; error: string | null } {
  const [encabezado = [], ...resto] = hoja;
  const indice = new Map<CampoFile, number>();
  encabezado.forEach((c, i) => {
    const col = COLUMNAS_IMPORTACION.find((x) => normalizar(x.titulo) === normalizar(texto(c)));
    if (col && !indice.has(col.campo)) indice.set(col.campo, i);
  });
  const faltan = COLUMNAS_IMPORTACION.filter((c) => c.obligatoria && !indice.has(c.campo)).map((c) => c.titulo);
  if (faltan.length) {
    return {
      filas: [],
      error: `Faltan columnas en la fila 1: ${faltan.join(', ')}. Use la plantilla.`,
    };
  }
  const porNombre = new Map(especialidades.map((e) => [normalizar(e.nombre), e.id]));

  const filas: FilaLeida[] = [];
  resto.forEach((fila, i) => {
    const celda = (campo: CampoFile): Celda => {
      const j = indice.get(campo);
      return j === undefined ? null : fila[j];
    };
    if (COLUMNAS_IMPORTACION.every((c) => !texto(celda(c.campo)))) return;
    const errores: ErrorDeCampo[] = [];
    const error = (campo: CampoFile, mensaje: string) => errores.push({ campo, mensaje });

    const fecha = leerFecha(celda('fechaNacimiento'));
    if (fecha === undefined) error('fechaNacimiento', 'La fecha no se entiende: escríbala como dd/mm/aaaa');

    const nombreEsp = texto(celda('especialidadId'));
    const especialidadId = porNombre.get(normalizar(nombreEsp)) ?? 0;
    if (!especialidadId) {
      error(
        'especialidadId',
        nombreEsp ? `«${nombreEsp}» no está en el catálogo de especialidades` : 'Falta la especialidad',
      );
    }

    const anioIngreso = entero(celda('anioIngreso'));
    if (anioIngreso === undefined || anioIngreso === null)
      error('anioIngreso', 'Escriba el año de ingreso con cuatro cifras');

    const condicionTexto = normalizar(texto(celda('condicion')));
    const condicion: CondicionFile | undefined =
      condicionTexto === '' || condicionTexto === 'estudiante'
        ? 'ESTUDIANTE'
        : condicionTexto === 'egresado' || condicionTexto === 'egresada'
          ? 'EGRESADO'
          : undefined;
    if (!condicion) error('condicion', 'Escriba Estudiante o Egresado');

    const generoTexto = normalizar(texto(celda('genero')));
    const genero: Genero | null | undefined =
      generoTexto === ''
        ? null
        : ['femenino', 'f', 'mujer'].includes(generoTexto)
          ? 'FEMENINO'
          : ['masculino', 'm', 'varon', 'hombre'].includes(generoTexto)
            ? 'MASCULINO'
            : undefined;
    if (genero === undefined) error('genero', 'Escriba Femenino o Masculino');

    const anioFormacion = entero(celda('anioFormacion'));
    if (anioFormacion === undefined) error('anioFormacion', 'Escriba un número del 1 al 5');

    const opcional = (campo: CampoFile) => texto(celda(campo)) || null;
    filas.push({
      filaExcel: i + 2,
      errores,
      datos: {
        ci: texto(celda('ci')),
        complemento: texto(celda('complemento')).toUpperCase(),
        codigo: texto(celda('codigo')),
        nombres: texto(celda('nombres')),
        apellidoPaterno: opcional('apellidoPaterno'),
        apellidoMaterno: opcional('apellidoMaterno'),
        fechaNacimiento: fecha ?? null,
        celular: opcional('celular'),
        email: opcional('email'),
        especialidadId,
        anioIngreso: anioIngreso ?? 0,
        condicion: condicion ?? 'ESTUDIANTE',
        genero: genero ?? null,
        modalidad: (opcional('modalidad')?.toUpperCase() ?? null) as Modalidad | null,
        anioFormacion: anioFormacion ?? null,
      },
    });
  });
  return { filas, error: null };
}

/** El nombre de la columna para un campo que nombra la API (body.x o x). */
export const tituloDeCampo = (campo: string) =>
  COLUMNAS_IMPORTACION.find((c) => c.campo === campo.replace(/^body\./, ''))?.titulo ?? campo;
