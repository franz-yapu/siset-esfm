import { Link } from 'react-router';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import type { RequisitoDelFile } from '@/types/requisitos';
import { useUsuario } from '@/hooks';
import { useMiFile } from '@/hooks/useFiles';
import { useMisRequisitos } from '@/hooks/useRequisitos';
import { SEMAFORO } from '@/config/estados';
import { ETIQUETA_ESTADO } from '@/lib/requisitos';
import { ordinal } from '@/lib/formato';
import { Alerta, Card, Cargando, Semaforo } from '@/components/ui';
import { Saludo } from './comun';

const MENSAJE = {
  VERDE: 'Todo en orden',
  AMARILLO: 'Tienes requisitos pendientes',
  ROJO: 'Tu file necesita atención',
} as const;
const COLOR = { COMPLETO: 'VERDE', OBSERVADO: 'ROJO', PENDIENTE: 'AMARILLO' } as const;

/** Lo que el estudiante tiene que resolver con Kardex: bloqueo, observados y pendientes obligatorios. */
function alertas(bloqueado: boolean, requisitos: RequisitoDelFile[]): string[] {
  const obligatorios = requisitos.filter((r) => r.obligatorio);
  const pendientes = obligatorios.filter((r) => r.estado === 'PENDIENTE').length;
  return [
    ...(bloqueado ? ['Tu file está bloqueado. Acércate a Kardex.'] : []),
    ...obligatorios
      .filter((r) => r.estado === 'OBSERVADO')
      .map((r) => `${r.nombre}: observado${r.observacion ? ` (${r.observacion})` : ''}.`),
    ...(pendientes
      ? [`Te faltan ${pendientes} requisito${pendientes === 1 ? '' : 's'} obligatorio${pendientes === 1 ? '' : 's'}.`]
      : []),
  ];
}

/** P-10 · Inicio Estudiante contra la API (S2.7, DEC-043): el semáforo y los requisitos de su file. */
export function InicioEstudiante() {
  const u = useUsuario();
  const file = useMiFile(u);
  const requisitos = useMisRequisitos(u, Boolean(file.data));
  if (file.isLoading || (file.data && requisitos.isLoading)) return <Cargando />;
  const f = file.data;
  if (file.error || !f) return <Alerta tipo="error">{file.error?.message ?? 'No se pudo leer tu file.'}</Alerta>;
  const lista = requisitos.data ?? [];
  const obligatorios = lista.filter((r) => r.obligatorio);
  const avisos = alertas(f.bloqueado, lista);

  return (
    <>
      <Saludo nombre={f.nombres}>
        {f.especialidad} · ingreso {f.anioIngreso}
      </Saludo>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={clsx('rounded-xl border p-6', SEMAFORO[f.semaforo].fondo, SEMAFORO[f.semaforo].borde)}>
          <p className="text-sm text-slate-600">Estado de tu file</p>
          <Semaforo color={f.semaforo} texto={MENSAJE[f.semaforo]} size="lg" className="mt-3" />
          {f.bloqueado && f.motivoBloqueo && <p className="mt-3 text-sm text-red-700">{f.motivoBloqueo}</p>}
          <Link
            to="/mi-file"
            className="mt-5 inline-flex items-center gap-1 rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro"
          >
            Ver mi file completo <ArrowRight className="size-4" />
          </Link>
        </div>

        <Card title="Mis requisitos obligatorios">
          {requisitos.error ? (
            <Alerta tipo="error">{requisitos.error.message}</Alerta>
          ) : obligatorios.length === 0 ? (
            <p className="text-sm text-slate-500">Kardex todavía no cargó tus requisitos.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {obligatorios.map((r) => (
                <li key={r.codigo} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {r.nombre}
                    {r.anioFormacion ? <span className="text-slate-500"> · {ordinal(r.anioFormacion)} año</span> : null}
                  </span>
                  <Semaforo color={COLOR[r.estado]} texto={ETIQUETA_ESTADO[r.estado]} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Alertas">
          {avisos.length === 0 ? (
            <p className="text-sm text-slate-500">No tienes alertas. ¡Sigue así!</p>
          ) : (
            <ul className="space-y-2">
              {avisos.map((a) => (
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
