import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { useToast, useUsuario } from '@/hooks';
import { useMiFile, useMutacionFiles } from '@/hooks/useFiles';
import type { CambiosContacto, FileDetalle } from '@/types/files';
import { filesService } from '@/services/files.service';
import { erroresDelFormularioFile } from '@/lib/files';
import { EditorFoto } from '@/components/file/FotoFile';
import { useMisEntregas, useMisRequisitos } from '@/hooks/useRequisitos';
import { EntregasRequisitos } from '@/components/file/EntregasRequisitos';
import { fecha } from '@/lib/formato';
import { Alerta, Button, Card, Cargando, Input, Tabs } from '@/components/ui';
import { CabeceraFile } from '@/components/file/CabeceraFile';
import { RequisitosFile } from '@/components/file/RequisitosFile';
import { ImprimirFolder, TablaFolder } from '@/components/file/HojaFolderPersonal';

const Dato = ({ titulo, valor }: { titulo: string; valor: string | null }) => (
  <div>
    <dt className="text-xs text-suave">{titulo}</dt>
    <dd className="text-sm text-tinta">{valor || '—'}</dd>
  </div>
);

/** Correo, celular y dirección: lo único que el estudiante cambia de su file (ADR-0013). */
function MiContacto({ f }: { f: FileDetalle }) {
  const u = useUsuario();
  const toast = useToast();
  const [d, setD] = useState({ email: f.email ?? '', celular: f.celular ?? '', direccion: f.direccion ?? '' });
  const [errores, setErrores] = useState<Partial<Record<string, string>>>({});
  const guardar = useMutacionFiles((c: CambiosContacto) => filesService.editarMio(c, u));
  const cambios: CambiosContacto = Object.fromEntries(
    (['email', 'celular', 'direccion'] as const)
      .map((k) => [k, d[k].trim() || null] as const)
      .filter(([k, v]) => v !== (f[k] ?? null)),
  );

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErrores({});
    try {
      await guardar.mutateAsync(cambios);
      toast.success('Tus datos se guardaron');
    } catch (err) {
      const { campos, general } = erroresDelFormularioFile(err);
      setErrores(campos);
      if (general) toast.error(general);
    }
  };

  return (
    <form onSubmit={enviar} noValidate className="grid gap-4 md:grid-cols-3">
      <Input
        label="Correo"
        type="email"
        value={d.email}
        onChange={(e) => setD({ ...d, email: e.target.value })}
        error={errores.email}
      />
      <Input
        label="Celular"
        value={d.celular}
        onChange={(e) => setD({ ...d, celular: e.target.value })}
        error={errores.celular}
      />
      <Input
        label="Dirección"
        value={d.direccion}
        onChange={(e) => setD({ ...d, direccion: e.target.value })}
        error={errores.direccion}
      />
      <div className="md:col-span-3">
        <Button type="submit" icon={Save} loading={guardar.isPending} disabled={Object.keys(cambios).length === 0}>
          Guardar mis datos
        </Button>
      </div>
    </form>
  );
}

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
      <CabeceraFile file={f} foto={{ id: 'mio', version: f.foto }} />
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
          <div className="mb-6 space-y-5 border-b border-regla pb-6">
            <EditorFoto id="mio" version={f.foto} nombre={f.nombre} />
            <MiContacto key={`${f.email}|${f.celular}|${f.direccion}`} f={f} />
          </div>
        )}
        {tab === 'datos' && (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Dato titulo="Nombre completo" valor={f.nombre} />
            <Dato titulo="C.I." valor={[f.ci, f.complemento].filter(Boolean).join('-')} />
            <Dato titulo="Código de estudiante" valor={f.codigo} />
            <Dato titulo="Especialidad" valor={f.especialidad} />
            <Dato titulo="Año de ingreso" valor={String(f.anioIngreso)} />
            <Dato titulo="Fecha de nacimiento" valor={f.fechaNacimiento && fecha(f.fechaNacimiento)} />
          </dl>
        )}
      </Card>
      <p className="mt-3 text-xs text-suave">
        Puedes cambiar tu foto, correo, celular y dirección. Si otro dato está mal, acércate a Kardex.
      </p>
    </>
  );
}
