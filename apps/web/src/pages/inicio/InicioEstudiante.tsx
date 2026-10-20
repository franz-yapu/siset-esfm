import { Link } from 'react-router';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useMiFile } from '@/hooks/useFiles';
import { useMisRequisitos } from '@/hooks/useRequisitos';
import { alertasDelEstudiante, ETIQUETA_ESTADO } from '@/lib/requisitos';
import { Alerta, Card, Cargando, Semaforo } from '@/components/ui';
import { Saludo } from './comun';

const MENSAJE = {
  VERDE: 'Todo en orden',
  AMARILLO: 'Tienes requisitos pendientes',
  ROJO: 'Tu file necesita atención',
} as const;
const COLOR = { COMPLETO: 'VERDE', OBSERVADO: 'ROJO', PENDIENTE: 'AMARILLO' } as const;

/** P-10 · Inicio Estudiante contra la API (S2.7, DEC-043): el semáforo y los requisitos de su file. */
export function InicioEstudiante() {
  const u = useUsuario();
  const file = useMiFile(u);
  const requisitos = useMisRequisitos(u, Boolean(file.data));
  if (file.isLoading || (file.data && requisitos.isLoading)) return <Cargando />;
  const f = file.data;
  if (file.error || !f) return <Alerta tipo="error">{file.error?.message ?? 'No se pudo leer tu file.'}</Alerta>;
  const lista = requisitos.data ?? [];
  // Los mismos que cuentan las alertas y el semáforo: obligatorios que se le piden a este file.
  const obligatorios = lista.filter((r) => r.obligatorio && r.aplica);
  const avisos = alertasDelEstudiante(f.bloqueado, lista);
  // Un egresado no tiene semáforo (DEC-060); con cuenta de estudiante no debería llegar aquí (D-08).
  const color = f.semaforo;
  const completos = obligatorios.filter((r) => r.estado === 'COMPLETO').length;

  return (
    <>
      <Saludo nombre={f.nombres}>
        {f.especialidad} · ingreso {f.anioIngreso}
      </Saludo>
      {/* Cada bloque con su propia altura: la lista larga no estira a los demás. */}
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="space-y-4">
          <section className="rounded-[10px] border border-borde bg-white p-5">
            <h2 className="text-[13px] text-suave">Estado de tu file</h2>
            {color ? (
              <Semaforo color={color} texto={MENSAJE[color]} className="mt-2" />
            ) : (
              <p className="mt-2 text-sm text-suave">Egresado: no se piden requisitos.</p>
            )}
            {obligatorios.length > 0 && (
              <>
                <p className="mt-4 text-[28px] leading-8 text-tinta tabular-nums">
                  {completos}
                  <span className="text-base text-suave"> de {obligatorios.length}</span>
                </p>
                <p className="text-[13px] text-suave">requisitos obligatorios completos</p>
                {/* La barra a la proporción real, sin color propio. */}
                <div className="mt-3 h-2 rounded-full bg-[#eef1f4]" aria-hidden>
                  <div
                    className="h-2 rounded-full bg-primario"
                    style={{ width: `${(completos / obligatorios.length) * 100}%` }}
                  />
                </div>
              </>
            )}
            {f.bloqueado && f.motivoBloqueo && <p className="mt-3 text-sm text-[#b4232a]">{f.motivoBloqueo}</p>}
            <Link
              to="/mi-file"
              className="mt-5 inline-flex h-9 items-center gap-1 rounded-md bg-primario px-3.5 text-sm font-medium text-white hover:bg-primario-oscuro"
            >
              Ver mi file completo <ArrowRight className="size-4" />
            </Link>
          </section>
          <Card title="Alertas">
            {avisos.length === 0 ? (
              <p className="text-sm text-suave">No tienes alertas.</p>
            ) : (
              <ul className="space-y-2">
                {avisos.map((a) => (
                  <li key={a} className="flex gap-2 text-sm text-[#92400e]">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Mis requisitos obligatorios" className="lg:col-span-2">
          {requisitos.error ? (
            <Alerta tipo="error">{requisitos.error.message}</Alerta>
          ) : obligatorios.length === 0 ? (
            <p className="text-sm text-suave">Kardex todavía no cargó tus requisitos.</p>
          ) : (
            <ul className="divide-y divide-regla">
              {obligatorios.map((r) => (
                <li key={r.codigo} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>{r.nombre}</span>
                  <Semaforo color={COLOR[r.estado]} texto={ETIQUETA_ESTADO[r.estado]} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
