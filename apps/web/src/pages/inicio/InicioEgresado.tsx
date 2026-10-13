import { Link } from 'react-router';
import { ArrowRight, FileText } from 'lucide-react';
import { useAsync, useUsuario } from '@/hooks';
import { filesService } from '@/services/files.service';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { semaforoFile, alertasFile } from '@/lib/reglas';
import { fecha } from '@/lib/formato';
import { Alerta, Card, Cargando, EmptyState, EstadoBadge, ProgresoPasos, Semaforo } from '@/components/ui';
import { Saludo } from './comun';

/** P-11 · Inicio Egresado. */
export function InicioEgresado() {
  const u = useUsuario();
  const { data, loading, error } = useAsync(
    () => Promise.all([filesService.miFile(u), hojasRutaService.misTramites(u)]),
    [u.id],
  );
  if (loading) return <Cargando />;
  if (error || !data) return <Alerta tipo="error">{error}</Alerta>;
  const [f, tramites] = data;
  const activos = tramites.filter((t) => t.estado !== 'ENTREGADO');
  const ultimo = activos[0] ?? tramites[0];

  return (
    <>
      <Saludo nombre={f.nombres}>Maestra/o egresada/o · {f.especialidad}</Saludo>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title={`Mis trámites activos (${activos.length})`}
          className="lg:col-span-2"
          actions={
            <Link to="/mis-tramites" className="text-sm text-acento hover:underline">
              Ver todos
            </Link>
          }
        >
          {!ultimo ? (
            <EmptyState
              icono={FileText}
              titulo="No tienes trámites"
              texto="Cuando la Secretaría registre tu hoja de ruta, aparecerá aquí."
            />
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{ultimo.nro}</p>
                  <p className="text-sm text-slate-500">
                    {ultimo.tipo} · ingresó el {fecha(ultimo.fechaIngreso)}
                  </p>
                </div>
                <EstadoBadge estado={ultimo.estado} />
              </div>
              <div className="my-4">
                <ProgresoPasos estado={ultimo.estado} />
              </div>
              {ultimo.estado === 'LISTO' && (
                <Alerta tipo="exito" className="mb-3">
                  Tu documento está listo. Puedes recogerlo en la Secretaría de Dirección (La Paz).
                </Alerta>
              )}
              <Link
                to={`/mis-tramites/${ultimo.nro}`}
                className="inline-flex items-center gap-1 rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro"
              >
                Ver seguimiento <ArrowRight className="size-4" />
              </Link>
              {activos.length > 1 && (
                <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                  {activos.slice(1).map((t) => (
                    <li key={t.nro}>
                      <Link
                        to={`/mis-tramites/${t.nro}`}
                        className="flex items-center justify-between gap-2 py-2 text-sm hover:text-acento"
                      >
                        <span>
                          {t.nro} · {t.tipo}
                        </span>
                        <EstadoBadge estado={t.estado} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
        <Card title="Mi file">
          <Semaforo color={semaforoFile(f)} size="lg" />
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {alertasFile(f).map((a) => (
              <li key={a}>• {a}</li>
            ))}
          </ul>
          <Link to="/mi-file" className="mt-4 inline-block text-sm text-acento hover:underline">
            Ver mi file
          </Link>
        </Card>
      </div>
    </>
  );
}
