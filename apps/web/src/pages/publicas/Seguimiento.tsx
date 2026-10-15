import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, MapPin, Search, ShieldCheck } from 'lucide-react';
import type { Seguimiento as Resultado } from '@/types/hojas-ruta';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { ESTADOS_HR } from '@/config/estados-hoja-ruta';
import { Alerta, Button, Card, EstadoHojaRutaBadge, Input, Timeline } from '@/components/ui';
import { fecha } from '@/lib/formato';

/** P-02 · Consulta pública de trámite contra POST /seguimiento (RF-09, S4.1). A esta página apunta el QR. */
export function Seguimiento() {
  const [params] = useSearchParams();
  const [nro, setNro] = useState(params.get('hr') ?? '');
  const [ci, setCi] = useState('');
  const [res, setRes] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    document.getElementById(nro ? 'ci-titular' : 'nro-hr')?.focus();
  }, [nro]);

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
    <div className="min-h-screen">
      <header className="bg-primario px-4 py-4 text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div>
            <p className="font-semibold">SISET</p>
            <p className="text-xs text-sky-100">Consulta pública de trámites</p>
          </div>
          <Link to="/login" className="flex items-center gap-1 text-sm text-sky-100 hover:text-white">
            <ArrowLeft className="size-4" />
            Iniciar sesión
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <Card title="Consulta el estado de tu trámite">
          <form onSubmit={consultar} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
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
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="size-3.5" />
            Por tu seguridad solo mostramos tu nombre y el avance del trámite.
          </p>
        </Card>

        {error && <Alerta tipo="error">{error}</Alerta>}

        {res && (
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">
                  {res.nro} · {res.tipo}
                </p>
                <p className="text-lg font-semibold text-slate-900">{res.titular}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                  <MapPin className="size-3.5" />
                  Ahora en: {res.sedeActual} · Ingresó el {fecha(res.fechaIngreso)}
                  {res.fechaCierre && ` · Entregado el ${fecha(res.fechaCierre)}`}
                </p>
              </div>
              <EstadoHojaRutaBadge estado={res.estado} className="text-sm" />
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
        )}
      </main>
    </div>
  );
}
