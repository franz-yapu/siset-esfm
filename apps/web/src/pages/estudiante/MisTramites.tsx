import { Link, useParams } from 'react-router';
import { ArrowLeft, Download, FileText, MapPin } from 'lucide-react';
import { useAsync, useToast, useUsuario } from '@/hooks';
import { hojasRutaPrototipoService } from '@/services/hojasRuta-prototipo.service';
import { nombreSede } from '@/config/catalogos';
import { fecha } from '@/lib/formato';
import {
  Alerta,
  Button,
  Card,
  Cargando,
  EmptyState,
  EstadoBadge,
  PageHeader,
  ProgresoPasos,
  Timeline,
} from '@/components/ui';

/** P-21 · Mis trámites (lista). */
export function MisTramites() {
  const u = useUsuario();
  const { data, loading } = useAsync(() => hojasRutaPrototipoService.misTramites(u), [u.id]);
  if (loading || !data) return <Cargando />;
  return (
    <>
      <PageHeader
        titulo="Mis trámites"
        subtitulo="Sigue cada hoja de ruta desde que se registra en La Paz hasta la entrega."
      />
      {data.length === 0 ? (
        <EmptyState icono={FileText} titulo="No tienes trámites registrados" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((t) => (
            <li key={t.nro}>
              <Link
                to={`/mis-tramites/${t.nro}`}
                className="block rounded-[10px] border border-borde bg-white p-4 transition-colors hover:border-control hover:bg-[#f7f9fb]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-tinta">{t.nro}</p>
                    <p className="text-sm text-suave">{t.tipo}</p>
                  </div>
                  <EstadoBadge estado={t.estado} />
                </div>
                <p className="mt-3 text-xs text-suave">Ingresó el {fecha(t.fechaIngreso)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** P-21 · Detalle de mi trámite: como P-02 pero sin pedir CI. */
export function MiTramite() {
  const u = useUsuario();
  const { nro = '' } = useParams();
  const toast = useToast();
  const { data: t, loading, error } = useAsync(() => hojasRutaPrototipoService.miTramite(nro, u), [nro, u.id]);
  if (loading) return <Cargando />;
  if (error || !t) return <Alerta tipo="error">{error}</Alerta>;
  return (
    <>
      <PageHeader
        titulo={t.nro}
        subtitulo={`${t.tipo} · ingresó el ${fecha(t.fechaIngreso)}`}
        acciones={
          <>
            <Link
              to="/mis-tramites"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-suave hover:bg-[#eef1f4]"
            >
              <ArrowLeft className="size-4" />
              Volver
            </Link>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => toast.success('Comprobante descargado (simulado)')}
            >
              Descargar comprobante
            </Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Estado actual">
          <EstadoBadge estado={t.estado} className="text-sm" />
          <p className="mt-3 flex items-center gap-1 text-sm text-suave">
            <MapPin className="size-4" />
            {nombreSede(t.sedeActualId)}
          </p>
          <div className="mt-4">
            <ProgresoPasos estado={t.estado} />
          </div>
          {t.estado === 'LISTO' && (
            <Alerta tipo="exito" className="mt-4">
              Tu documento está listo para recoger en la Secretaría de Dirección (La Paz).
            </Alerta>
          )}
          {t.estado === 'OBSERVADO' && (
            <Alerta tipo="aviso" className="mt-4">
              Tu trámite tiene una observación: {t.movimientos.at(-1)?.obs}. Acércate a Kardex.
            </Alerta>
          )}
        </Card>
        <Card title="Seguimiento" className="lg:col-span-2">
          <Timeline movimientos={t.movimientos} />
        </Card>
      </div>
    </>
  );
}
