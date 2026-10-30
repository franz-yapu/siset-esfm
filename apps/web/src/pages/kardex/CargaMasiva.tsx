import { useState, type ChangeEvent, type DragEvent } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import clsx from 'clsx';
import type { ResultadoImportacion } from '@/types/files';
import { useToast, useUsuario } from '@/hooks';
import { useEspecialidades, useMutacionFiles } from '@/hooks/useFiles';
import { filesService } from '@/services/files.service';
import {
  COLUMNAS_IMPORTACION,
  leerFilas,
  tituloDeCampo,
  type Celda,
  type ErrorDeCampo,
  type FilaLeida,
} from '@/lib/importacion-files';
import { Alerta, Badge, Button, Card, DataTable, PageHeader } from '@/components/ui';

type Accion = ResultadoImportacion['filas'][number]['accion'];

const ACCION: Record<Accion, { texto: string; clase: string }> = {
  CREAR: { texto: 'Nuevo', clase: 'bg-acento-palido text-primario' },
  ACTUALIZAR: { texto: 'Se actualiza', clase: 'bg-[#fff6e0] text-[#8a5a00]' },
  SIN_CAMBIOS: { texto: 'Sin cambios', clase: 'bg-[#eef1f4] text-[#2b3440]' },
  ERROR: { texto: 'Con errores', clase: 'bg-[#fdecec] text-[#b4232a]' },
};

const CUENTA: Record<string, string> = {
  CREADA: 'cuenta creada',
  EXISTENTE: 'ya tenía cuenta',
  REACTIVADA: 'cuenta reactivada',
  DESACTIVADA: 'cuenta desactivada (egresado)',
  USUARIO_OCUPADO: 'sin cuenta: su CI ya es usuario de otra cuenta',
};

interface FilaVista {
  filaExcel: number;
  ci: string;
  nombre: string;
  accion: Accion;
  detalle: string[];
  cuenta: string | null;
}

/**
 * Une lo que no se pudo leer del Excel con lo que dijo la API: si la web ya marcó un campo, su mensaje manda (la API
 * solo vería el valor de relleno).
 */
function vista(leidas: FilaLeida[], r: ResultadoImportacion): FilaVista[] {
  return r.filas.map((f, i) => {
    const leida = leidas[i];
    const propios = new Set(leida.errores.map((e) => e.campo));
    const errores: ErrorDeCampo[] = [
      ...leida.errores,
      ...f.errores.filter((e) => !propios.has(e.campo.replace(/^body\./, ''))),
    ];
    return {
      filaExcel: leida.filaExcel,
      ci: f.ci ?? leida.datos.ci,
      nombre: f.nombre ?? leida.datos.nombres,
      accion: errores.length ? 'ERROR' : f.accion,
      detalle: errores.length
        ? errores.map((e) => `${tituloDeCampo(e.campo)}: ${e.mensaje}`)
        : f.cambios.map((c) => `Cambia ${tituloDeCampo(c).toLowerCase()}`),
      cuenta: f.cuenta ? CUENTA[f.cuenta] : null,
    };
  });
}

/** La plantilla: los encabezados con un ejemplo, las reglas y el catálogo de especialidades. */
async function descargarPlantilla(especialidades: { nombre: string }[]) {
  const { default: escribir } = await import('write-excel-file/browser');
  const negrita = (value: string) => ({ value, fontWeight: 'bold' as const });
  await escribir([
    {
      sheet: 'Files',
      data: [COLUMNAS_IMPORTACION.map((c) => negrita(c.titulo)), COLUMNAS_IMPORTACION.map((c) => c.ejemplo)],
      columns: COLUMNAS_IMPORTACION.map((c) => ({ width: Math.max(14, c.titulo.length + 4) })),
    },
    {
      sheet: 'Instrucciones',
      data: [
        [negrita('Columna'), negrita('Regla')],
        ...COLUMNAS_IMPORTACION.map((c) => [c.titulo, c.regla]),
        [],
        ['Una fila por estudiante o egresado. Si el CI ya tiene file, se actualiza con los datos de la fila.'],
        ['Los estudiantes quedan con su cuenta: usuario = CI, contraseña = fecha de nacimiento (dd-mm-aaaa).'],
        ['Los egresados no tienen cuenta: siguen su trámite con el QR de la hoja de ruta.'],
      ],
      columns: [{ width: 24 }, { width: 70 }],
    },
    {
      sheet: 'Especialidades',
      data: [[negrita('Especialidad')], ...especialidades.map((e) => [e.nombre])],
      columns: [{ width: 50 }],
    },
  ]).toFile('plantilla-files-siset.xlsx');
}

/** P-46 · Importar files desde Excel (DEC-064 #3), contra POST /files/importacion. */
export function CargaMasiva() {
  const u = useUsuario();
  const toast = useToast();
  const { data: especialidades = [] } = useEspecialidades();
  const [archivo, setArchivo] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leidas, setLeidas] = useState<FilaLeida[]>([]);
  const [revision, setRevision] = useState<ResultadoImportacion | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const importar = useMutacionFiles((aplicar: boolean) =>
    filesService.importar(
      leidas.map((l) => l.datos),
      aplicar,
      u,
    ),
  );

  const filas = revision ? vista(leidas, resultado ?? revision) : [];
  const conErrores = filas.filter((f) => f.accion === 'ERROR').length;
  const aEscribir = filas.filter((f) => f.accion === 'CREAR' || f.accion === 'ACTUALIZAR').length;

  const leer = async (f: File | undefined) => {
    if (!f) return;
    setArchivo(f.name);
    setError(null);
    setRevision(null);
    setResultado(null);
    setLeyendo(true);
    try {
      const { readSheet } = await import('read-excel-file/browser');
      const hoja = (await readSheet(f)) as unknown as Celda[][];
      // Si el catálogo todavía no llegó, se espera: sin él, ninguna especialidad coincidiría.
      const catalogo = especialidades.length ? especialidades : await filesService.especialidades();
      const leido = leerFilas(hoja, catalogo);
      if (leido.error || leido.filas.length === 0) {
        setError(leido.error ?? 'El archivo no tiene filas con datos debajo del encabezado.');
        setLeidas([]);
        return;
      }
      setLeidas(leido.filas);
      setRevision(
        await filesService.importar(
          leido.filas.map((l) => l.datos),
          false,
          u,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error && 'codigo' in e
          ? e.message
          : 'No se pudo leer el archivo. Use un Excel (.xlsx) con la plantilla.',
      );
    } finally {
      setLeyendo(false);
    }
  };

  const aplicar = async () => {
    const r = await importar.mutateAsync(true);
    setResultado(r);
    if (r.aplicado) {
      toast.success(`Importados: ${r.resumen.crear} nuevos y ${r.resumen.actualizar} actualizados`);
    } else {
      toast.error('No se importó nada: hay filas con errores');
    }
  };

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    void leer(e.dataTransfer.files[0]);
  };

  return (
    <>
      <PageHeader
        titulo="Importar files desde Excel"
        subtitulo="Estudiantes y egresados con los mismos datos de «Nuevo file». Si el CI ya tiene file, se actualiza."
        acciones={
          <Button variant="secondary" icon={Download} onClick={() => void descargarPlantilla(especialidades)}>
            Descargar plantilla
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Card title="1 · Elegir el archivo">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={soltar}
            className={clsx(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed p-8 text-center text-sm',
              arrastrando ? 'border-acento bg-acento-palido' : 'border-borde hover:bg-[#f5f7fa]',
            )}
          >
            <FileSpreadsheet className="size-8 text-acento" aria-hidden />
            <span className="font-medium text-tinta">
              {archivo ?? 'Arrastre aquí el Excel o haga clic para elegirlo'}
            </span>
            <span className="text-suave">Solo .xlsx · la primera hoja · la fila 1 con los encabezados</span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              aria-label="Archivo Excel"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                void leer(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {leyendo && <p className="mt-3 text-sm text-suave">Leyendo y revisando…</p>}
          {error && (
            <Alerta tipo="error" className="mt-3">
              {error}
            </Alerta>
          )}
        </Card>
        <Card title="Columnas">
          <ul className="space-y-1.5 text-sm">
            {COLUMNAS_IMPORTACION.map((c) => (
              <li key={c.campo}>
                <span className="font-medium text-tinta">{c.titulo}</span>
                {c.obligatoria && <span className="text-[#b4232a]"> *</span>}
                <span className="block text-[13px] text-suave">{c.regla}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {revision && (
        <Card title={resultado?.aplicado ? '3 · Resultado' : '2 · Revisión'} className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge className={ACCION.CREAR.clase}>{(resultado ?? revision).resumen.crear} nuevos</Badge>
            <Badge className={ACCION.ACTUALIZAR.clase}>
              {(resultado ?? revision).resumen.actualizar} se actualizan
            </Badge>
            <Badge className={ACCION.SIN_CAMBIOS.clase}>{(resultado ?? revision).resumen.sinCambios} sin cambios</Badge>
            <Badge className={ACCION.ERROR.clase}>{conErrores} con errores</Badge>
          </div>
          {resultado?.aplicado ? (
            <Alerta tipo="exito" className="mb-3">
              Importación terminada. Los estudiantes entran con su CI y su fecha de nacimiento (dd-mm-aaaa); el sistema
              les pide cambiarla al entrar.
            </Alerta>
          ) : conErrores ? (
            <Alerta tipo="error" className="mb-3">
              Corrija las filas con errores en el Excel y vuelva a elegirlo. No se importa nada mientras haya errores.
            </Alerta>
          ) : (
            <div className="mb-3 flex justify-end">
              <Button
                icon={Upload}
                loading={importar.isPending}
                disabled={aEscribir === 0}
                onClick={() => void aplicar()}
              >
                {aEscribir === 0 ? 'Nada que importar' : `Importar ${aEscribir} files`}
              </Button>
            </div>
          )}
          <DataTable
            data={filas}
            rowKey={(f) => f.filaExcel}
            vacio="Sin filas"
            columns={[
              { key: 'filaExcel', header: 'Fila', render: (f) => <span className="tabular-nums">{f.filaExcel}</span> },
              { key: 'ci', header: 'CI', principal: true },
              { key: 'nombre', header: 'Nombre' },
              {
                key: 'accion',
                header: 'Qué pasa',
                render: (f) => <Badge className={ACCION[f.accion].clase}>{ACCION[f.accion].texto}</Badge>,
              },
              {
                key: 'detalle',
                header: 'Detalle',
                render: (f) => (
                  <ul className={clsx('text-[13px]', f.accion === 'ERROR' ? 'text-[#b4232a]' : 'text-suave')}>
                    {f.detalle.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                    {f.cuenta && <li className="text-tinta">{f.cuenta}</li>}
                  </ul>
                ),
              },
            ]}
          />
        </Card>
      )}
    </>
  );
}
