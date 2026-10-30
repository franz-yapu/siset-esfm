import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, MapPin, Search, ShieldCheck } from 'lucide-react';
import type { Seguimiento as Resultado } from '@/types/hojas-ruta';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { ESTADOS_HR } from '@/config/estados-hoja-ruta';
import { Alerta, Button, Card, EstadoHojaRutaBadge, Input, Timeline } from '@/components/ui';
import { fecha } from '@/lib/formato';
import { CAMINO } from '@/config/camino-tramite';

/** P-02 · Consulta pública de trámite contra POST /seguimiento (RF-09, S4.1). A esta página apunta el QR. */
export function Seguimiento() {
  const [params] = useSearchParams();
  const [nro, setNro] = useState(params.get('hr') ?? '');
  const [ci, setCi] = useState('');
  const [res, setRes] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Solo al abrir: con el N.º del QR (?hr=) el foco va al CI. Si dependiera de `nro`, saltaría al CI al teclear.
  useEffect(() => {
    document.getElementById(params.get('hr') ? 'ci-titular' : 'nro-hr')?.focus();
  }, [params]);

  const consultar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setRes(null);
    if (!nro.trim() || !ci.trim()) {
      setError('Ingresa el N.º de hoja de ruta y el CI del titular');
      return;
    }
    setCargando(true);
    try {
      setRes(await hojasRutaService.seguimiento(nro, ci));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-primario text-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div>
            <p className="font-semibold tracking-wide">SISET</p>
            <p className="text-xs text-emerald-100">Consulta pública de trámites</p>
          </div>
          <Link to="/login" className="flex items-center gap-1 text-sm text-emerald-100 hover:text-white">
            <ArrowLeft className="size-4" />
            Iniciar sesión
          </Link>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <div>
            <h1 className="text-[22px] leading-7 font-semibold text-tinta">Consulta el estado de tu trámite</h1>
            <p className="mt-1 text-[15px] text-suave">
              Escribe el N.º de tu hoja de ruta y el CI del titular. No necesitas una cuenta.
            </p>
          </div>
          <form
            onSubmit={consultar}
            className="grid gap-3 rounded-[10px] bg-[#f5f7fa] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            noValidate
          >
            <Input
              id="nro-hr"
              label="N.º de hoja de ruta"
              placeholder="HR-2026-000123"
              value={nro}
              onChange={(e) => setNro(e.target.value.toUpperCase())}
            />
            <Input
              id="ci-titular"
              label="CI del titular"
              inputMode="numeric"
              value={ci}
              onChange={(e) => setCi(e.target.value)}
            />
            <Button type="submit" icon={Search} loading={cargando}>
              Consultar
            </Button>
          </form>
          <p className="flex items-center gap-1.5 text-[13px] text-suave">
            <ShieldCheck className="size-4" strokeWidth={1.75} />
            Por tu seguridad solo mostramos tu nombre y el avance del trámite.
          </p>

          {error && <Alerta tipo="error">{error}</Alerta>}

          {res && (
            <section aria-label="Avance del trámite">
              <Card>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] text-suave">
                      <span className="font-mono">{res.nro}</span> · {res.tipo}
                    </p>
                    <p className="text-lg font-semibold text-tinta">{res.titular}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-suave">
                      <MapPin className="size-3.5" />
                      Ahora en: {res.sedeActual} · Ingresó el {fecha(res.fechaIngreso)}
                      {res.fechaCierre &&
                        ` · ${res.estado === 'DEVUELTO' ? 'Devuelto' : 'Entregado'} el ${fecha(res.fechaCierre)}`}
                    </p>
                  </div>
                  <EstadoHojaRutaBadge estado={res.estado} />
                </div>
                <Timeline
                  ocultarResponsable
                  pasos={res.pasos.map((p) => ({
                    etiqueta: ESTADOS_HR[p.estado].etiqueta,
                    punto: ESTADOS_HR[p.estado].punto,
                    fecha: p.fecha,
                    sede: p.sede,
                    usuario: '',
                  }))}
                />
              </Card>
            </section>
          )}
        </div>

        {/* Ayuda al costado: dónde está el número y por dónde pasa un trámite. */}
        <aside className="space-y-6 text-sm">
          <section>
            <h2 className="text-[15px] font-semibold text-tinta">¿Dónde está el N.º?</h2>
            <p className="mt-1 text-suave">
              En la carátula que te dieron al registrar el trámite. Su código QR abre esta página con el número ya
              escrito.
            </p>
          </section>
          <section>
            <h2 className="text-[15px] font-semibold text-tinta">Por dónde pasa un trámite</h2>
            <ol className="mt-3">
              {CAMINO.map((p, i) => (
                <li key={p.paso} className="flex gap-3">
                  <span className="flex flex-col items-center" aria-hidden>
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-acento" />
                    {i < CAMINO.length - 1 && <span className="w-px flex-1 bg-borde" />}
                  </span>
                  <span className="pb-3">
                    <span className="block font-medium text-tinta">{p.paso}</span>
                    <span className="block text-[13px] text-suave">{p.donde}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </main>
    </div>
  );
}
