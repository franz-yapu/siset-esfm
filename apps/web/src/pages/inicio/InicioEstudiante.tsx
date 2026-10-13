import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { useAsync, useUsuario } from '@/hooks';
import { filesService } from '@/services/files.service';
import {
  alertasFile,
  anioActual,
  CODIGOS_REQUISITO,
  NOMBRE_REQUISITO,
  semaforoFile,
  semaforoRequisito,
} from '@/lib/reglas';
import { SEMAFORO } from '@/config/estados';
import { ordinal } from '@/lib/formato';
import { Alerta, Card, Cargando, Semaforo } from '@/components/ui';
import { Saludo } from './comun';

const MENSAJE = {
  VERDE: 'Todo en orden',
  AMARILLO: 'Tienes requisitos pendientes',
  ROJO: 'Tu file está bloqueado',
} as const;

/** P-10 · Inicio Estudiante. */
export function InicioEstudiante() {
  const u = useUsuario();
  const { data: f, loading, error } = useAsync(() => filesService.miFile(u), [u.id]);
  if (loading) return <Cargando />;
  if (error || !f) return <Alerta tipo="error">{error}</Alerta>;

  const color = semaforoFile(f);
  const vigente = f.matriculas.find((m) => m.estado === 'Vigente');
  const alertas = alertasFile(f);

  return (
    <>
      <Saludo nombre={f.nombres}>
        {f.especialidad} · {ordinal(anioActual(f))} año de formación
      </Saludo>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={clsx('rounded-xl border p-6 lg:col-span-1', SEMAFORO[color].fondo, SEMAFORO[color].borde)}>
          <p className="text-sm text-slate-600">Estado de tu file</p>
          <Semaforo color={color} texto={MENSAJE[color]} size="lg" className="mt-3" />
          {f.bloqueado && <p className="mt-3 text-sm text-red-700">{f.motivoBloqueo}</p>}
          <Link
            to="/mi-file"
            className="mt-5 inline-flex items-center gap-1 rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro"
          >
            Ver mi file completo <ArrowRight className="size-4" />
          </Link>
        </div>

        <Card title="Mis requisitos" className="lg:col-span-1">
          <ul className="divide-y divide-slate-100">
            <li className="flex items-center justify-between py-2 text-sm">
              <span>Matrícula vigente</span>
              <Semaforo
                color={vigente ? 'VERDE' : 'AMARILLO'}
                texto={vigente ? `Gestión ${vigente.gestion}` : 'Sin matrícula'}
                size="sm"
              />
            </li>
            {CODIGOS_REQUISITO.map((c) => {
              const r = f.requisitos[c];
              return (
                <li key={c} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {NOMBRE_REQUISITO[c]}
                    {c === 'TCLO' && r.nivel ? ` (${r.nivel})` : ''}
                  </span>
                  <Semaforo
                    color={semaforoRequisito(r)}
                    texto={r.estado === 'COMPLETO' ? 'Completo' : 'Pendiente'}
                    size="sm"
                  />
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Alertas" className="lg:col-span-1">
          {alertas.length === 0 ? (
            <p className="text-sm text-slate-500">No tienes alertas. ¡Sigue así!</p>
          ) : (
            <ul className="space-y-2">
              {alertas.map((a) => (
                <li key={a} className="flex gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
