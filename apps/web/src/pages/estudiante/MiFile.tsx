import { useState } from 'react';
import { useAsync, useUsuario } from '@/hooks';
import { filesService } from '@/services/files.service';
import { Alerta, Card, Cargando, Tabs } from '@/components/ui';
import { CabeceraFile } from '@/components/file/CabeceraFile';
import { TablaMatriculas, TablaRequisitos, TablaResultados } from '@/components/file/TablasFile';

/** P-20 · Mi file académico (solo lectura, solo el propio). */
export function MiFile() {
  const u = useUsuario();
  const [tab, setTab] = useState('matriculas');
  const { data: f, loading, error } = useAsync(() => filesService.miFile(u), [u.id]);
  if (loading) return <Cargando />;
  if (error || !f) return <Alerta tipo="error">{error}</Alerta>;

  return (
    <>
      <CabeceraFile file={f} />
      <Card>
        <Tabs
          activa={tab}
          onChange={setTab}
          className="mb-4"
          tabs={[
            { id: 'matriculas', label: 'Matrículas', count: f.matriculas.length },
            { id: 'resultados', label: 'Resultados anuales', count: f.resultados.length },
            { id: 'requisitos', label: 'Requisitos' },
          ]}
        />
        {tab === 'matriculas' && <TablaMatriculas file={f} />}
        {tab === 'resultados' && <TablaResultados file={f} />}
        {tab === 'requisitos' && <TablaRequisitos file={f} />}
      </Card>
      <p className="mt-3 text-xs text-slate-500">Vista de solo lectura. Si encuentras un error, acércate a Kardex.</p>
    </>
  );
}
