import { useState, type DragEvent } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { useToast, useUsuario } from '@/hooks';
import { filesPrototipoService, type DatosFile } from '@/services/files-prototipo.service';
import { Alerta, Button, Card, DataTable, PageHeader } from '@/components/ui';

type Fila = DatosFile & { fila: number; error?: string };

/** Datos fijos de la vista previa (simulación del Excel leído). */
const FILAS: Fila[] = [
  ['8011223', 'Ximena', 'Huarachi Coaquira', 'EST-2026-0101', 'Matemática'],
  ['8022334', 'Daniel', 'Mamani Tola', 'EST-2026-0102', 'Comunicación y Lenguajes'],
  ['7012345', 'Juan', 'Mamani C.', 'EST-2026-0103', 'Matemática', 'CI duplicado'],
  ['8044556', 'Patricia', 'Condori Huanca', 'EST-2026-0104', 'Educación Física y Deportes'],
  ['8055667', 'Ronald', 'Quisbert Limachi', 'EST-2026-0105', 'Ciencias Naturales: Biología-Geografía'],
  ['8066778', 'Mery', 'Alanoca Ticona', 'EST-2026-0106', 'Historia', 'Especialidad no existe'],
  ['8077889', 'Iván', 'Choque Rojas', 'EST-2026-0107', 'Educación Primaria Comunitaria Vocacional'],
  ['8088990', 'Roxana', 'Poma Callisaya', 'EST-2026-0108', 'Matemática'],
  ['8099001', 'Wilson', 'Nina Apaza', 'EST-2026-0109', 'Comunicación y Lenguajes'],
  ['8100112', 'Lidia', 'Yujra Quispe', 'EST-2026-0110', 'Educación Primaria Comunitaria Vocacional'],
].map(([ci, nombres, apellidos, codigo, especialidad, error], i) => ({
  fila: i + 2,
  ci,
  nombres,
  apellidos,
  codigo,
  especialidad,
  anioIngreso: 2026,
  condicion: 'ESTUDIANTE',
  error,
}));

/** Las columnas que lee la carga, en el orden de la plantilla, con la regla de cada una. */
const COLUMNAS: [string, string][] = [
  ['CI', 'Único; con complemento: 1234567-1A'],
  ['Nombres', 'Obligatorio'],
  ['Apellidos', 'Paterno y materno'],
  ['Código de estudiante', 'Único'],
  ['Especialidad', 'Como en el catálogo'],
  ['Año de ingreso', 'Cuatro cifras'],
  ['Condición', 'Estudiante o Egresado'],
];

/** P-46 · Carga masiva de files (simulada). */
export function CargaMasiva() {
  const u = useUsuario();
  const toast = useToast();
  const [archivo, setArchivo] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resumen, setResumen] = useState<{ importados: number; errores: number } | null>(null);
  const validas = FILAS.filter((f) => !f.error).length;

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    setArchivo(e.dataTransfer.files[0]?.name ?? 'files_historicos.xlsx');
  };
  const importar = async () => {
    setImportando(true);
    try {
      setResumen(await filesPrototipoService.importar(FILAS, u));
    } finally {
      setImportando(false);
    }
  };
  const reiniciar = () => {
    setArchivo(null);
    setResumen(null);
  };

  return (
    <>
      <PageHeader titulo="Carga masiva de files" subtitulo="Para migrar los files históricos desde Excel (D-13)." />
      {/* Los tres pasos, en orden: el actual en celeste, los hechos en verde. */}
      <ol className="mb-5 flex flex-wrap gap-2 text-sm" aria-label="Pasos de la carga">
        {['Subir archivo', 'Revisar', 'Importar'].map((p, i) => {
          const paso = resumen ? 2 : archivo ? 1 : 0;
          return (
            <li
              key={p}
              aria-current={i === paso ? 'step' : undefined}
              className={clsx(
                'flex h-8 items-center gap-2 rounded-full px-3',
                i === paso
                  ? 'bg-acento-palido font-medium text-primario'
                  : i < paso
                    ? 'bg-[#dcfae5] text-[#04250e]'
                    : 'bg-[#eef2f6] text-suave',
              )}
            >
              {i < paso ? (
                <CheckCircle2 className="size-4" aria-hidden />
              ) : (
                <span
                  aria-hidden
                  className={clsx('size-2 rounded-full', i === paso ? 'bg-acento' : 'border-[1.5px] border-control')}
                />
              )}
              {p}
            </li>
          );
        })}
      </ol>

      {!archivo && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card
            className="flex flex-col [&>div:last-child]:flex [&>div:last-child]:flex-1"
            title="Subir el Excel"
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={() => toast.success('Plantilla descargada (simulado)')}
              >
                Descargar plantilla
              </Button>
            }
          >
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={soltar}
              className={clsx(
                'flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-16 text-center transition-colors hover:border-acento hover:bg-acento-palido/50',
                arrastrando ? 'border-acento bg-acento-palido' : 'border-control',
              )}
            >
              <Upload className="size-8 text-acento" strokeWidth={1.5} />
              <span className="mt-2 font-medium text-tinta">Arrastra aquí el archivo Excel</span>
              <span className="text-sm text-suave">o haz clic para elegirlo (.xlsx)</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={(e) => setArchivo(e.target.files?.[0]?.name ?? 'files_historicos.xlsx')}
              />
            </label>
          </Card>
          {/* Lo que Kardex necesita saber antes de llenar la plantilla. */}
          <Card title="Columnas de la plantilla" className="self-start">
            <ul className="divide-y divide-regla text-sm">
              {COLUMNAS.map(([columna, nota]) => (
                <li key={columna} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="font-medium text-tinta">{columna}</span>
                  <span className="text-right text-[13px] text-suave">{nota}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-suave">
              Una fila por estudiante. Las filas con errores se muestran al revisar y no se importan.
            </p>
          </Card>
        </div>
      )}

      {archivo && !resumen && (
        <Card
          title={
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-green-700" />
              {archivo}
            </span>
          }
          actions={
            <>
              <Button variant="secondary" onClick={reiniciar}>
                Cambiar archivo
              </Button>
              <Button icon={Upload} loading={importando} onClick={importar}>
                Importar {validas} filas válidas
              </Button>
            </>
          }
        >
          <Alerta tipo="aviso" className="mb-3">
            {FILAS.length - validas} filas tienen errores y no se importarán. Corrígelas en el Excel y vuelve a
            subirlas.
          </Alerta>
          <DataTable
            data={FILAS}
            rowKey={(f) => f.fila}
            resaltar={(f) => Boolean(f.error)}
            columns={[
              { key: 'fila', header: 'Fila' },
              { key: 'ci', header: 'CI', principal: true },
              { key: 'nombre', header: 'Nombre', render: (f) => `${f.nombres} ${f.apellidos}` },
              { key: 'codigo', header: 'Código' },
              { key: 'esp', header: 'Especialidad', render: (f) => f.especialidad },
              {
                key: 'val',
                header: 'Validación',
                render: (f) =>
                  f.error ? (
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <XCircle className="size-4" />
                      {f.error}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="size-4" />
                      OK
                    </span>
                  ),
              },
            ]}
          />
        </Card>
      )}

      {resumen && (
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="size-12 text-green-600" />
            <p className="mt-3 text-lg font-semibold">
              {resumen.importados} importados, {resumen.errores} con error
            </p>
            <p className="text-sm text-suave">
              Los files nuevos quedan con requisitos pendientes. La operación quedó en la bitácora.
            </p>
            <Button className="mt-4" variant="secondary" onClick={reiniciar}>
              Cargar otro archivo
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
