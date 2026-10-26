import { useState } from 'react';
import { useUsuario } from '@/hooks';
import { useMiFile } from '@/hooks/useFiles';
import { useMisEntregas, useMisRequisitos } from '@/hooks/useRequisitos';
import { EntregasRequisitos } from '@/components/file/EntregasRequisitos';
import { fecha } from '@/lib/formato';
import { Alerta, Card, Cargando, Tabs } from '@/components/ui';
import { CabeceraFile } from '@/components/file/CabeceraFile';
import { RequisitosFile } from '@/components/file/RequisitosFile';
import { ImprimirFolder, TablaFolder } from '@/components/file/HojaFolderPersonal';

const Dato = ({ titulo, valor }: { titulo: string; valor: string | null }) => (
  <div>
    <dt className="text-xs text-suave">{titulo}</dt>
    <dd className="text-sm text-tinta">{valor || '—'}</dd>
  </div>
);

/**
 * P-20 · Mi file académico contra la API (S2.7, DEC-043): solo lectura y solo el propio (la API lo toma de la
 * sesión). Sin matrículas ni notas: no se registran en SISET (D-30 propuesta, D-07). La primera pestaña es la hoja
 * "Documentación existente en folder personal", con Sí o No en cada requisito, y se imprime en su formato (DEC-062).
 */
export function MiFile() {
  const u = useUsuario();
  const [tab, setTab] = useState('requisitos');
  const { data: f, isLoading, error } = useMiFile(u);
  const requisitos = useMisRequisitos(u, Boolean(f));
  const entregas = useMisEntregas(u, Boolean(f) && tab === 'entregas');
  if (isLoading) return <Cargando />;
  if (error || !f) return <Alerta tipo="error">{error?.message ?? 'No se pudo leer tu file.'}</Alerta>;

  return (
    <>
      <CabeceraFile file={f} />
      <Card>
        <Tabs
          activa={tab}
          onChange={setTab}
          className="mb-4"
          tabs={[
            { id: 'requisitos', label: 'Hoja del folder' },
            { id: 'detalle', label: 'Detalle de requisitos' },
            { id: 'entregas', label: 'Mis entregas' },
            { id: 'datos', label: 'Mis datos' },
          ]}
        />
        {tab === 'requisitos' &&
          (requisitos.isLoading ? (
            <Cargando />
          ) : requisitos.error || !requisitos.data ? (
            <Alerta tipo="error">{requisitos.error?.message ?? 'No se pudieron leer tus requisitos.'}</Alerta>
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <ImprimirFolder file={f} requisitos={requisitos.data} />
              </div>
              <TablaFolder requisitos={requisitos.data} />
            </>
          ))}
        {tab === 'detalle' && <RequisitosFile fileId={f.id} editable={false} propio />}
        {tab === 'entregas' && (
          <EntregasRequisitos
            titular={f}
            entregas={entregas.data}
            cargando={entregas.isLoading}
            error={entregas.error}
            propio
          />
        )}
        {tab === 'datos' && (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Dato titulo="Nombre completo" valor={f.nombre} />
            <Dato titulo="C.I." valor={[f.ci, f.complemento].filter(Boolean).join('-')} />
            <Dato titulo="Código de estudiante" valor={f.codigo} />
            <Dato titulo="Especialidad" valor={f.especialidad} />
            <Dato titulo="Año de ingreso" valor={String(f.anioIngreso)} />
            <Dato titulo="Fecha de nacimiento" valor={f.fechaNacimiento && fecha(f.fechaNacimiento)} />
            <Dato titulo="Celular" valor={f.celular} />
            <Dato titulo="Correo" valor={f.email} />
          </dl>
        )}
      </Card>
      <p className="mt-3 text-xs text-suave">Vista de solo lectura. Si encuentras un error, acércate a Kardex.</p>
    </>
  );
}
