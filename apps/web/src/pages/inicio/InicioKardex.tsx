import { useNavigate } from 'react-router';
import { ListChecks, Search } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useResumenFiles } from '@/hooks/useFiles';
import { useResumenKardexHojas } from '@/hooks/useHojasRuta';
import { Badge, Button, Card, Cargando, DataTable, GrillaKpi, KpiCard } from '@/components/ui';
import { CaminoTramites } from '@/components/hojas/CaminoTramites';
import { pendientes, Saludo } from './comun';

interface Atencion {
  id: string;
  tipo: 'File bloqueado' | 'Requisito observado';
  quien: string;
  detalle: string;
  to: string;
}

/**
 * P-15 · Inicio Kardex (S1.12). Los files salen de filesService (API o mock): total, bloqueados, en rojo y la
 * lista de rojos. Los trámites salen de hojasRutaService: por recoger, en impresión y por remitir (DEC-037).
 */
export function InicioKardex() {
  const u = useUsuario();
  const nav = useNavigate();
  const files = useResumenFiles();
  const hojas = useResumenKardexHojas();
  if (files.isLoading || !files.data) return <Cargando />;

  const atencion: Atencion[] = [
    ...files.data.atencion.map((f) => ({
      id: `f${f.id}`,
      tipo: f.bloqueado ? ('File bloqueado' as const) : ('Requisito observado' as const),
      quien: f.nombre,
      detalle: f.bloqueado ? (f.motivoBloqueo ?? '') : 'Una defensa o requisito quedó observado',
      to: `/files/${f.id}`,
    })),
  ];

  // Los trámites en Kardex, en el orden en que pasan por la oficina (DEC-037).
  const camino = hojas.data
    ? [
        { etiqueta: 'Por recoger', texto: 'por recoger', total: hojas.data.porRecoger, to: '/revision' },
        { etiqueta: 'En impresión', texto: 'en impresión', total: hojas.data.enImpresion, to: '/emision' },
        {
          etiqueta: 'Por remitir a Calahumana',
          texto: 'por remitir a Calahumana',
          total: hojas.data.porRemitir,
          to: '/revision',
        },
      ]
    : [];

  return (
    <>
      {/* Usuarios y Bitácora son del Administrador (DEC-054). */}
      <Saludo
        nombre={u.nombre}
        acciones={
          <>
            <Button variant="secondary" icon={ListChecks} onClick={() => nav('/requisitos')}>
              Requisitos por modalidad
            </Button>
            <Button icon={Search} onClick={() => nav('/files')}>
              Buscar file
            </Button>
          </>
        }
      >
        {hojas.data ? pendientes(camino, 'No tienes trámites pendientes en Kardex.') : 'Archivo Kardex · UA Ancocagua'}
      </Saludo>
      {hojas.data && <CaminoTramites titulo="Trámites en Kardex" pasos={camino} />}
      <h2 className="mb-2 text-[15px] font-semibold text-tinta">Files académicos</h2>
      <GrillaKpi columnas={3}>
        <KpiCard titulo="Files" valor={files.data.total} to="/files" />
        <KpiCard alerta titulo="Bloqueados" valor={files.data.bloqueados} to="/files?bloqueados=1" />
        <KpiCard alerta titulo="En rojo" valor={files.data.rojos} to="/files?semaforo=ROJO" />
      </GrillaKpi>
      <Card title="Requieren atención">
        <DataTable
          data={atencion}
          rowKey={(a) => a.id}
          onRowClick={(a) => nav(a.to)}
          vacio="Nada pendiente"
          columns={[
            {
              key: 'tipo',
              header: 'Tipo',
              render: (a) => (
                <Badge className={a.tipo === 'File bloqueado' ? 'bg-[#ffedea] text-[#831c1e]' : undefined}>
                  {a.tipo}
                </Badge>
              ),
            },
            {
              key: 'quien',
              header: 'Titular',
              principal: true,
              render: (a) => <span className="font-medium">{a.quien}</span>,
            },
            { key: 'detalle', header: 'Detalle', className: 'text-suave' },
          ]}
        />
      </Card>
    </>
  );
}
