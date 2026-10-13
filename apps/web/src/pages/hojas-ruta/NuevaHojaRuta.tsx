import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Eye, Printer, Save, Search, Send, X } from 'lucide-react';
import type { FileAcademico, HojaRutaConTitular, TipoTramite } from '@/types';
import { useToast, useUsuario } from '@/hooks';
import { filesService } from '@/services/files.service';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { TIPOS_TRAMITE } from '@/config/catalogos';
import { alertasFile, nombreCompleto, semaforoFile } from '@/lib/reglas';
import { urlSeguimiento } from '@/lib/qr';
import { Alerta, Button, Card, Input, Modal, PageHeader, Select, Semaforo, Textarea } from '@/components/ui';

/** P-30 · Nueva hoja de ruta (ingesta). */
export function NuevaHojaRuta() {
  const u = useUsuario();
  const toast = useToast();
  const nav = useNavigate();
  const [ci, setCi] = useState('');
  const [sugerencias, setSugerencias] = useState<FileAcademico[]>([]);
  const [titular, setTitular] = useState<FileAcademico | null>(null);
  const [tipo, setTipo] = useState<TipoTramite>('Historial académico');
  const [valorado, setValorado] = useState('');
  const [obs, setObs] = useState('');
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState<'enviar' | 'registrar' | null>(null);
  const [creada, setCreada] = useState<HojaRutaConTitular | null>(null);

  useEffect(() => {
    if (titular) return;
    let vivo = true;
    filesService.buscarPorCi(ci).then((r) => {
      if (vivo) setSugerencias(r);
    });
    return () => {
      vivo = false;
    };
  }, [ci, titular]);

  const bloqueado = titular?.bloqueado ?? false;
  const errorValorado = intento && !valorado.trim() ? 'Ingresa el N.º de valorado canjeado' : null;

  const guardar = async (enviar: boolean) => {
    setIntento(true);
    if (!titular || bloqueado || !valorado.trim()) return;
    setGuardando(enviar ? 'enviar' : 'registrar');
    try {
      const h = await hojasRutaService.crear({ fileId: titular.id, tipo, nroValorado: valorado, obs }, enviar, u);
      setCreada(h);
      toast.success(enviar ? `Trámite ${h.nro} registrado y enviado a Ancocagua` : `Trámite ${h.nro} registrado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setGuardando(null);
    }
  };

  const limpiar = () => {
    setCreada(null);
    setTitular(null);
    setCi('');
    setValorado('');
    setObs('');
    setIntento(false);
  };

  return (
    <>
      <PageHeader titulo="Nueva hoja de ruta" subtitulo="Registra el trámite del egresado y genera el código con QR." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="1 · Buscar titular">
          {!titular ? (
            <div className="relative">
              <Input
                label="CI del titular"
                placeholder="Escribe el CI o el nombre"
                value={ci}
                onChange={(e) => setCi(e.target.value)}
                autoFocus
                inputMode="search"
                error={intento ? 'Selecciona un titular' : null}
              />
              <Search className="pointer-events-none absolute top-9 right-3 size-4 text-slate-400" />
              {sugerencias.length > 0 && (
                <ul
                  className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
                  role="listbox"
                >
                  {sugerencias.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setTitular(f);
                          setIntento(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span>
                          <span className="font-medium">{f.ci}</span> · {nombreCompleto(f)}
                        </span>
                        <Semaforo color={semaforoFile(f)} texto="" size="sm" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {ci.length >= 2 && sugerencias.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  No hay files con ese CI. Pide a Kardex que registre el file.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="font-semibold text-slate-900">{nombreCompleto(titular)}</p>
                  <p className="text-sm text-slate-500">
                    CI {titular.ci} · {titular.especialidad}
                  </p>
                  <Semaforo color={semaforoFile(titular)} className="mt-2" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTitular(null);
                    setCi('');
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100"
                  aria-label="Cambiar titular"
                >
                  <X className="size-4" />
                </button>
              </div>
              {bloqueado ? (
                <Alerta tipo="error" titulo="File bloqueado">
                  {titular.motivoBloqueo}. No se puede registrar el trámite hasta que Kardex lo desbloquee.
                </Alerta>
              ) : (
                alertasFile(titular).length > 0 && (
                  <Alerta tipo="aviso">
                    {alertasFile(titular).join(' · ')}. Kardex lo revisará al recibir el trámite.
                  </Alerta>
                )
              )}
            </div>
          )}
        </Card>

        <Card title="2 · Datos del trámite">
          <div className="space-y-4">
            <Select label="Tipo de trámite" value={tipo} onChange={(e) => setTipo(e.target.value as TipoTramite)}>
              {TIPOS_TRAMITE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <Input
              label="N.º de valorado"
              value={valorado}
              onChange={(e) => setValorado(e.target.value)}
              error={errorValorado}
              inputMode="numeric"
            />
            <Textarea label="Observación (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                icon={Send}
                disabled={!titular || bloqueado}
                loading={guardando === 'enviar'}
                onClick={() => guardar(true)}
              >
                Registrar y enviar a Ancocagua
              </Button>
              <Button
                variant="secondary"
                icon={Save}
                disabled={!titular || bloqueado}
                loading={guardando === 'registrar'}
                onClick={() => guardar(false)}
              >
                Solo registrar
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(creada)}
        onClose={limpiar}
        title="Trámite registrado"
        footer={
          creada && (
            <>
              <Button variant="secondary" onClick={limpiar}>
                Registrar otro
              </Button>
              <Button variant="secondary" icon={Eye} onClick={() => nav(`/hojas-ruta/${creada.nro}`)}>
                Ver trámite
              </Button>
              <Button icon={Printer} onClick={() => nav(`/hojas-ruta/${creada.nro}/caratula`)}>
                Imprimir carátula
              </Button>
            </>
          )
        }
      >
        {creada && (
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="size-10 text-green-600" />
            <p className="mt-2 text-sm text-slate-500">Código generado</p>
            <p className="text-2xl font-bold tracking-wide text-primario">{creada.nro}</p>
            <div className="my-4 rounded-lg border border-slate-200 p-3">
              <QRCodeSVG value={urlSeguimiento(creada.nro)} size={168} />
            </div>
            <p className="text-xs break-all text-slate-500">{urlSeguimiento(creada.nro)}</p>
            <p className="mt-2 text-sm text-slate-600">
              {creada.titular} · {creada.tipo}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
