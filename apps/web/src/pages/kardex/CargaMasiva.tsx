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
      <ol className="mb-4 flex flex-wrap gap-2 text-sm">
        {['Subir archivo', 'Revisar', 'Importar'].map((p, i) => {
          const paso = resumen ? 2 : archivo ? 1 : 0;
          return (
            <li
              key={p}
              className={clsx(
                'rounded-full px-3 py-1',
                i === paso
                  ? 'bg-primario text-white'
                  : i < paso
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-200 text-suave',
              )}
            >
              {i + 1}. {p}
            </li>
          );
        })}
      </ol>

      {!archivo && (
        <Card>
          <Button variant="secondary" icon={Download} onClick={() => toast.success('Plantilla descargada (simulado)')}>
            Descargar plantilla Excel
          </Button>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={soltar}
            className={clsx(
              'mt-4 flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-4 py-12 text-center',
              arrastrando ? 'border-acento bg-sky-50' : 'border-control',
            )}
          >
            <Upload className="size-8 text-suave" />
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
