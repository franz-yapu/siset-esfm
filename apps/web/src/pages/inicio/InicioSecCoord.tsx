import { Link } from 'react-router';
import { ArrowRightLeft, Inbox, PackageCheck } from 'lucide-react';
import { useAccion, useAsync, useUsuario } from '@/hooks';
import { reportesService } from '@/services/reportes.service';
import { pasesService } from '@/services/pases.service';
import { sedeCorta } from '@/config/catalogos';
import { fechaHora } from '@/lib/formato';
import { Button, Card, Cargando, DataTable, KpiCard } from '@/components/ui';
import { GrillaKpi, Saludo } from './comun';

/** P-13 · Inicio Secretaría de Coordinación (Ancocagua). */
export function InicioSecCoord() {
  const u = useUsuario();
  const { ejecutar, ocupado } = useAccion();
  const { data, loading, reload } = useAsync(
    () => Promise.all([reportesService.resumenInicio(), pasesService.porRecibir(u.sedeId ?? 2)]),
    [u.sedeId],
  );
  if (loading && !data) return <Cargando />;
  if (!data) return null;
  const [r, pases] = data;

  const recibir = async (nro: string) => {
    if (await ejecutar(() => pasesService.recibir([nro], u), 'Pase recibido')) reload();
  };

  return (
    <>
      <Saludo nombre={u.nombre}>Secretaría de Coordinación · UA Ancocagua</Saludo>
      <GrillaKpi>
        <KpiCard titulo="Por recibir" valor={pases.length} icono={Inbox} color="ambar" to="/pases" />
        <KpiCard titulo="Recibidos hoy" valor={r.recibidosHoyAnc} icono={PackageCheck} color="verde" />
        <KpiCard titulo="Derivados a Kardex hoy" valor={r.derivadosKardexHoy} icono={ArrowRightLeft} />
      </GrillaKpi>
      <Card
        title="Bandeja: por recibir"
        actions={
          <Link to="/pases" className="text-sm text-acento hover:underline">
            Abrir bandeja
          </Link>
        }
      >
        <DataTable
          data={pases}
          rowKey={(p) => p.nro}
          vacio="No hay pases por recibir"
          columns={[
            {
              key: 'nro',
              header: 'N.º HR',
              principal: true,
              render: (p) => <span className="font-medium">{p.nro}</span>,
            },
            { key: 'titular', header: 'Titular' },
            { key: 'viene', header: 'Viene de', render: (p) => sedeCorta(p.vieneDe) },
            { key: 'fecha', header: 'Enviado', render: (p) => fechaHora(p.fechaEnvio) },
            {
              key: 'accion',
              header: '',
              render: (p) => (
                <Button size="sm" variant="success" loading={ocupado} onClick={() => recibir(p.nro)}>
                  Recibir
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
