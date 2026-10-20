import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PenLine } from 'lucide-react';
import type { FilaHojaRuta } from '@/types/hojas-ruta';
import { useToast, useUsuario } from '@/hooks';
import { useFirmasCoordinador, useMutacionHojasRuta } from '@/hooks/useHojasRuta';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { ErrorApi } from '@/lib/errores';
import { diasDesde, diasTexto, fecha } from '@/lib/formato';
import {
  Alerta,
  Button,
  Card,
  Cargando,
  DataTable,
  EstadoHojaRutaBadge,
  PageHeader,
  Tabs,
  Textarea,
} from '@/components/ui';
import { Confirmar } from '@/components/hojas/Confirmar';

/**
 * P-50 · Firmas del Coordinador contra la API. No hay dictamen (D-11): el Coordinador solo firma los certificados
 * impresos por Kardex, y eso es el paso FIRMA_COORDINADOR de la hoja de ruta. No puede devolverlos (D-37, propuesta).
 */
export function Firmas() {
  const nav = useNavigate();
  const u = useUsuario();
  const toast = useToast();
  const [tab, setTab] = useState('pendientes');
  const [firmando, setFirmando] = useState<FilaHojaRuta | null>(null);
  const [obs, setObs] = useState('');
  const { data, isLoading, error } = useFirmasCoordinador();
  const firmar = useMutacionHojasRuta((a: { nro: string; observacion: string | null }) =>
    hojasRutaService.transicion(a.nro, 'FIRMA_COORDINADOR', a.observacion, u),
  );

  if (isLoading) return <Cargando />;
  if (error || !data) return <Alerta tipo="error">{error?.message ?? 'No se pudieron cargar las firmas'}</Alerta>;

  const confirmar = async () => {
    if (!firmando) return;
    try {
      await firmar.mutateAsync({ nro: firmando.nro, observacion: obs.trim() || null });
      toast.success(`Firmaste el trámite ${firmando.nro}`);
    } catch (e) {
      toast.error(
        e instanceof ErrorApi && e.codigo === 'TRANSICION_INVALIDA'
          ? 'Ese trámite ya no espera tu firma. La lista se actualizó.'
          : e instanceof Error
            ? e.message
            : 'Error',
      );
    }
    setFirmando(null);
    setObs('');
  };

  return (
    <>
      <PageHeader titulo="Firmas" subtitulo="Certificados que Kardex imprimió y esperan tu firma." />
      <Card>
        <Tabs
          activa={tab}
          onChange={setTab}
          className="mb-4"
          tabs={[
            { id: 'pendientes', label: 'Esperan tu firma', count: data.pendientes.length },
            { id: 'firmados', label: 'Firmados', count: data.firmados.length },
          ]}
        />
        {tab === 'pendientes' ? (
          <DataTable
            data={data.pendientes}
            rowKey={(h) => h.nro}
            searchable
            vacio="No hay certificados esperando tu firma"
            onRowClick={(h) => nav(`/hojas-ruta/${h.nro}`)}
            columns={[
              {
                key: 'nro',
                header: 'N.º HR',
                principal: true,
                render: (h) => <span className="font-mono text-[13px] font-medium whitespace-nowrap">{h.nro}</span>,
              },
              { key: 'titular', header: 'Titular', render: (h) => h.titular.nombre },
              { key: 'ci', header: 'CI', ocultarEnMovil: true, render: (h) => h.titular.ci },
              { key: 'tipo', header: 'Tipo', ocultarEnMovil: true, render: (h) => h.tipo.nombre },
              {
                key: 'dias',
                header: 'Desde el ingreso',
                sortValue: (h) => diasDesde(h.fechaIngreso),
                render: (h) => diasTexto(diasDesde(h.fechaIngreso)),
              },
              {
                key: 'accion',
                header: '',
                render: (h) => (
                  <Button
                    size="sm"
                    icon={PenLine}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFirmando(h);
                    }}
                  >
                    Firmar
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <DataTable
            data={data.firmados}
            rowKey={(h) => h.nro}
            searchable
            vacio="Aún no firmaste certificados"
            onRowClick={(h) => nav(`/hojas-ruta/${h.nro}`)}
            columns={[
              {
                key: 'nro',
                header: 'N.º HR',
                principal: true,
                render: (h) => <span className="font-mono text-[13px] font-medium whitespace-nowrap">{h.nro}</span>,
              },
              { key: 'titular', header: 'Titular', render: (h) => h.titular.nombre },
              { key: 'tipo', header: 'Tipo', ocultarEnMovil: true, render: (h) => h.tipo.nombre },
              { key: 'estado', header: 'Estado actual', render: (h) => <EstadoHojaRutaBadge estado={h.estado} /> },
              { key: 'ingreso', header: 'Ingresó', ocultarEnMovil: true, render: (h) => fecha(h.fechaIngreso) },
            ]}
          />
        )}
      </Card>

      <Confirmar
        abierto={firmando !== null}
        titulo="Firmar certificado"
        textoConfirmar="Firmar"
        cargando={firmar.isPending}
        onCerrar={() => setFirmando(null)}
        onConfirmar={() => void confirmar()}
      >
        <p>
          ¿Confirmas tu firma del trámite <strong>{firmando?.nro}</strong> ({firmando?.tipo.nombre}) de{' '}
          {firmando?.titular.nombre}? Quedará registrada en el historial y en la bitácora, y Kardex podrá remitirlo a
          Calahumana.
        </p>
        <Textarea
          className="mt-3"
          label="Observación (opcional)"
          value={obs}
          maxLength={255}
          onChange={(e) => setObs(e.target.value)}
        />
      </Confirmar>
    </>
  );
}
