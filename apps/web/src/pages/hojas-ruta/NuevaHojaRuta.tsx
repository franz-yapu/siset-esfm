import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { BellRing, CheckCircle2, Eye, Printer, Save, Search, X } from 'lucide-react';
import type { DetalleHojaRuta, TitularIngesta } from '@/types/hojas-ruta';
import { useToast, useUsuario } from '@/hooks';
import { useMutacionHojasRuta, useTiposTramite, useTitulares } from '@/hooks/useHojasRuta';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { ErrorApi } from '@/lib/errores';
import { urlSeguimiento } from '@/lib/qr';
import { Alerta, Button, Card, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui';

const ESPERA_BUSQUEDA = 300;

/**
 * P-30 · Nueva hoja de ruta (ingesta) contra POST /hojas-ruta (SDD S3.8-S3.9 §2.6). El titular sale de
 * /hojas-ruta/titulares: SEC_DIR no ve files (DEC-054).
 */
export function NuevaHojaRuta() {
  const u = useUsuario();
  const toast = useToast();
  const nav = useNavigate();
  const [texto, setTexto] = useState('');
  const [buscado, setBuscado] = useState('');
  const [titular, setTitular] = useState<TitularIngesta | null>(null);
  const [tipo, setTipo] = useState('');
  const [valorado, setValorado] = useState('');
  const [obs, setObs] = useState('');
  const [intento, setIntento] = useState(false);
  const [errorTitular, setErrorTitular] = useState<string | null>(null);
  const [errorValoradoApi, setErrorValoradoApi] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<'avisar' | 'registrar' | null>(null);
  const [creada, setCreada] = useState<DetalleHojaRuta | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBuscado(texto.trim()), ESPERA_BUSQUEDA);
    return () => clearTimeout(t);
  }, [texto]);

  // En Ancocagua, Secretaría de Coordinación solo recibe los certificados, sin valorado (D-32b, ADR-0011).
  const enAncocagua = u.rol === 'SEC_COORD';
  const { data: todosLosTipos = [] } = useTiposTramite();
  const tipos = enAncocagua ? todosLosTipos.filter((t) => !t.requiereValorado) : todosLosTipos;
  const tipoElegido = tipos.find((t) => t.codigo === tipo) ?? tipos[0];
  const { data: sugerencias } = useTitulares(buscado);
  const lista = !titular && buscado.length >= 2 ? (sugerencias ?? []) : [];

  const crear = useMutacionHojasRuta(async (avisar: boolean) => {
    const h = await hojasRutaService.crear(
      {
        fileId: titular!.fileId,
        tipoTramite: tipoElegido!.codigo,
        nroValorado: tipoElegido!.requiereValorado ? valorado.trim() : null,
        observacion: obs.trim() || null,
      },
      u,
    );
    if (!avisar) return { h, aviso: null };
    try {
      return { h: await hojasRutaService.transicion(h.nro, 'AVISAR_KARDEX', null, u), aviso: null };
    } catch (e) {
      return { h, aviso: e instanceof Error ? e.message : 'Error' };
    }
  });

  const bloqueado = titular?.bloqueado ?? false;
  const faltaValorado = Boolean(tipoElegido?.requiereValorado) && !valorado.trim();
  const errorValorado = errorValoradoApi ?? (intento && faltaValorado ? 'Ingresa el N.º de valorado canjeado' : null);

  const guardar = async (avisar: boolean) => {
    setIntento(true);
    setErrorTitular(null);
    setErrorValoradoApi(null);
    if (!titular || bloqueado || !tipoElegido || faltaValorado) return;
    setGuardando(avisar ? 'avisar' : 'registrar');
    try {
      const { h, aviso } = await crear.mutateAsync(avisar);
      setCreada(h);
      if (aviso) toast.error(`Se registró ${h.nro}, pero no se pudo avisar a Kardex: ${aviso}`);
      else toast.success(avisar ? `Trámite ${h.nro} registrado y avisado a Kardex` : `Trámite ${h.nro} registrado`);
    } catch (e) {
      const err = e instanceof ErrorApi ? e : null;
      if (err?.codigo === 'FILE_BLOQUEADO' || err?.codigo === 'FILE_NO_EGRESADO') setErrorTitular(err.message);
      else if (err?.codigo === 'VALIDACION') {
        const d = Array.isArray(err.detalles) ? (err.detalles as { ruta?: string; mensaje?: string }[]) : [];
        setErrorValoradoApi(d.find((x) => x.ruta === 'body.nroValorado')?.mensaje ?? err.message);
      } else toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setGuardando(null);
    }
  };

  const limpiar = () => {
    setCreada(null);
    setTitular(null);
    setTexto('');
    setValorado('');
    setObs('');
    setIntento(false);
    setErrorTitular(null);
  };

  return (
    <>
      <PageHeader
        titulo="Nueva hoja de ruta"
        subtitulo={
          enAncocagua
            ? 'Recibe en Ancocagua el pedido de un certificado de notas o de excelencia y genera el código con QR.'
            : 'Registra el trámite del egresado y genera el código con QR.'
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="1 · Buscar titular">
          {!titular ? (
            <div className="relative">
              <Input
                label="CI o nombre del egresado"
                placeholder="Escribe el CI o el nombre"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                autoFocus
                inputMode="search"
                error={intento ? 'Selecciona un titular' : null}
              />
              <Search className="pointer-events-none absolute top-9 right-3 size-4 text-suave" />
              {lista.length > 0 && (
                <ul
                  className="absolute z-10 mt-1 w-full overflow-hidden rounded-[10px] border border-borde bg-white shadow-lg"
                  role="listbox"
                >
                  {lista.map((f) => (
                    <li key={f.fileId}>
                      <button
                        type="button"
                        onClick={() => {
                          setTitular(f);
                          setIntento(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[#f5f7fa]"
                      >
                        <span>
                          <span className="font-medium">{f.ci}</span> · {f.nombre}
                        </span>
                        {f.bloqueado && <span className="text-xs text-red-700">bloqueado</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {buscado.length >= 2 && sugerencias && lista.length === 0 && (
                <p className="mt-2 text-sm text-suave">
                  No hay files de egresados con ese dato. Pide a Kardex que registre o actualice el file.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 rounded-[10px] border border-borde p-3">
                <div>
                  <p className="font-semibold text-tinta">{titular.nombre}</p>
                  <p className="text-sm text-suave">
                    CI {titular.ci} · {titular.especialidad}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTitular(null);
                    setTexto('');
                    setErrorTitular(null);
                  }}
                  className="rounded p-1 text-suave hover:bg-[#eef1f4]"
                  aria-label="Cambiar titular"
                >
                  <X className="size-4" />
                </button>
              </div>
              {bloqueado ? (
                <Alerta tipo="error" titulo="File bloqueado">
                  {titular.motivoBloqueo ?? 'El file está bloqueado'}. No se puede registrar el trámite hasta que Kardex
                  lo desbloquee.
                </Alerta>
              ) : (
                errorTitular && <Alerta tipo="error">{errorTitular}</Alerta>
              )}
            </div>
          )}
        </Card>

        <Card title="2 · Datos del trámite">
          <div className="space-y-4">
            <Select
              label="Tipo de trámite"
              value={tipoElegido?.codigo ?? ''}
              onChange={(e) => {
                setTipo(e.target.value);
                setErrorValoradoApi(null);
              }}
            >
              {tipos.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nombre}
                </option>
              ))}
            </Select>
            {tipoElegido?.requiereValorado ? (
              <Input
                label="N.º de valorado"
                value={valorado}
                maxLength={30}
                onChange={(e) => setValorado(e.target.value)}
                error={errorValorado}
                inputMode="numeric"
              />
            ) : (
              tipoElegido && <p className="text-sm text-suave">Este trámite no lleva valorado.</p>
            )}
            <Textarea
              label="Observación (opcional)"
              value={obs}
              maxLength={255}
              onChange={(e) => setObs(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                icon={BellRing}
                disabled={!titular || bloqueado}
                loading={guardando === 'avisar'}
                onClick={() => guardar(true)}
              >
                Registrar y avisar a Kardex
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
            <p className="mt-2 text-sm text-suave">Código generado</p>
            <p className="text-2xl font-bold tracking-wide text-primario">{creada.nro}</p>
            <div className="my-4 rounded-[10px] border border-borde p-3">
              <QRCodeSVG value={urlSeguimiento(creada.nro)} size={168} />
            </div>
            <p className="text-xs break-all text-suave">{urlSeguimiento(creada.nro)}</p>
            <p className="mt-2 text-sm text-suave">
              {creada.titular.nombre} · {creada.tipo.nombre}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
