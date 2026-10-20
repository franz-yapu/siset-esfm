import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Eye, Lock, RotateCcw, X } from 'lucide-react';
import clsx from 'clsx';
import type { FiltrosAuditoria, RegistroAuditoria } from '@/types/bitacora';
import {
  ACCIONES,
  ACCIONES_AUDITORIA,
  MODULOS,
  MODULOS_AUDITORIA,
  esAccion,
  esModulo,
  type TonoAccion,
} from '@/config/auditoria';
import { useAsync } from '@/hooks';
import { bitacoraService } from '@/services/bitacora.service';
import { Alerta, Badge, Button, DataTable, Input, PageHeader, Paginacion, Select } from '@/components/ui';
import { BuscadorUsuario } from './bitacora/BuscadorUsuario';
import { ModalDetalle } from './bitacora/ModalDetalle';
import {
  describirEntidad,
  describirRegistro,
  esCiInexistente,
  etiquetaAccion,
  etiquetaModulo,
  fechaHoraLaPaz,
  filtrosAUrl,
  filtrosDesdeUrl,
  tonoAccion,
} from './bitacora/presentacion';

/** Valor por defecto de la API (DEC-017). */
const POR_PAGINA = 50;

const TONO: Record<TonoAccion, string | undefined> = {
  normal: undefined,
  aviso: 'bg-[#fffbeb] text-[#92400e]',
  peligro: 'bg-[#ffedea] text-[#831c1e]',
};

const numero = new Intl.NumberFormat('es-BO');

/** P-48 · Bitácora de auditoría (solo lectura), conectada a GET /auditoria (SDD S6.5). */
export function Bitacora() {
  const [params, setParams] = useSearchParams();
  const { filtros: f, pagina } = filtrosDesdeUrl(params);
  const [ver, setVer] = useState<RegistroAuditoria | null>(null);
  // Nombres conocidos de los usuarios elegidos (la URL solo guarda el id).
  const [nombres, setNombres] = useState<Record<number, string>>({});
  // Texto de los registros elegidos para "Historial de" (la URL solo guarda entidad e id).
  const [registros, setRegistros] = useState<Record<string, string>>({});

  const rangoInvalido = Boolean(f.desde && f.hasta && f.desde > f.hasta);
  const clave = filtrosAUrl(f, pagina).toString();
  const { data, loading, error, reload } = useAsync(
    () => (rangoInvalido ? Promise.resolve(null) : bitacoraService.listar(f, pagina, POR_PAGINA)),
    [clave],
  );

  const ir = (nuevo: FiltrosAuditoria, nuevaPagina = 1) => setParams(filtrosAUrl(nuevo, nuevaPagina));
  const filtrar = (p: Partial<FiltrosAuditoria>) => {
    const nuevo: FiltrosAuditoria = { ...f, ...p };
    for (const k of Object.keys(nuevo) as (keyof FiltrosAuditoria)[]) {
      if (nuevo[k] === undefined || nuevo[k] === '') delete nuevo[k];
    }
    ir(nuevo);
  };
  const porUsuario = (u: { id: number; nombre: string }) => {
    setNombres((n) => ({ ...n, [u.id]: u.nombre }));
    filtrar({ usuarioId: u.id });
  };
  const historialDe = (r: RegistroAuditoria) => {
    if (!r.entidad) return;
    setRegistros((x) => ({ ...x, [`${r.entidad}:${r.entidadId ?? ''}`]: describirRegistro(r) }));
    filtrar({ entidad: r.entidad, entidadId: r.entidadId ?? undefined });
  };
  const etiquetaHistorial = f.entidad ? registros[`${f.entidad}:${f.entidadId ?? ''}`] : undefined;
  const hayFiltros = Object.keys(f).length > 0;
  const total = data?.total ?? 0;

  return (
    <>
      <PageHeader
        titulo="Bitácora de auditoría"
        subtitulo={data ? `${numero.format(total)} ${total === 1 ? 'registro' : 'registros'}` : undefined}
      />
      <Alerta tipo="info" className="mb-4">
        <span className="inline-flex items-center gap-1">
          <Lock className="size-4" />
          Registro de solo lectura. No se puede modificar ni borrar.
        </span>
      </Alerta>

      <div className="mb-4 grid gap-3 rounded-[10px] bg-[#f5f7fa] p-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          label="Desde"
          type="date"
          value={f.desde ?? ''}
          error={rangoInvalido ? '"Desde" no puede ser posterior a "Hasta".' : null}
          onChange={(e) => filtrar({ desde: e.target.value || undefined })}
        />
        <Input
          label="Hasta"
          type="date"
          value={f.hasta ?? ''}
          onChange={(e) => filtrar({ hasta: e.target.value || undefined })}
        />
        <BuscadorUsuario
          valor={f.usuarioId ? { id: f.usuarioId, nombre: nombres[f.usuarioId] } : null}
          onCambiar={(u) => (u ? porUsuario(u) : filtrar({ usuarioId: undefined }))}
        />
        <Select
          label="Módulo"
          value={f.modulo ?? ''}
          onChange={(e) => filtrar({ modulo: esModulo(e.target.value) ? e.target.value : undefined })}
        >
          <option value="">Todos</option>
          {MODULOS_AUDITORIA.map((m) => (
            <option key={m} value={m}>
              {MODULOS[m]}
            </option>
          ))}
        </Select>
        <Select
          label="Acción"
          value={f.accion ?? ''}
          onChange={(e) => filtrar({ accion: esAccion(e.target.value) ? e.target.value : undefined })}
        >
          <option value="">Todas</option>
          {ACCIONES_AUDITORIA.map((a) => (
            <option key={a} value={a}>
              {ACCIONES[a].etiqueta}
            </option>
          ))}
        </Select>
      </div>

      {hayFiltros && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {f.entidad && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-800 ring-1 ring-sky-200">
              Historial de: {etiquetaHistorial ?? describirEntidad(f.entidad, f.entidadId)}
              <button
                type="button"
                className="rounded p-0.5 hover:bg-sky-100"
                aria-label="Quitar filtro de registro"
                onClick={() => filtrar({ entidad: undefined, entidadId: undefined })}
              >
                <X className="size-3.5" />
              </button>
            </span>
          )}
          {hayFiltros && (
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => ir({})}>
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      {error ? (
        <Alerta
          tipo="error"
          titulo="No se pudo cargar la bitácora"
          accion={
            <Button size="sm" variant="secondary" onClick={reload}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alerta>
      ) : (
        <>
          <DataTable
            data={data?.datos ?? []}
            loading={loading}
            rowKey={(r) => r.id}
            pageSize={POR_PAGINA}
            vacio={rangoInvalido ? 'Corrija el rango de fechas' : 'No hay registros con estos filtros'}
            columns={[
              {
                key: 'fecha',
                header: 'Fecha y hora',
                principal: true,
                render: (r) => <span className="whitespace-nowrap">{fechaHoraLaPaz(r.fecha)}</span>,
              },
              {
                key: 'usuario',
                header: 'Usuario',
                render: (r) =>
                  r.usuario ? (
                    <button
                      type="button"
                      className="text-left hover:underline"
                      title="Ver solo los eventos de este usuario"
                      onClick={() => r.usuario && porUsuario(r.usuario)}
                    >
                      <span className="block">{r.usuario.nombre}</span>
                      <span className="block text-xs text-suave">{r.usuario.usuario}</span>
                    </button>
                  ) : (
                    <span className="text-suave italic">Sin usuario</span>
                  ),
              },
              {
                key: 'ip',
                header: 'IP',
                ocultarEnMovil: true,
                render: (r) => <code className="text-xs">{r.ip ?? '—'}</code>,
              },
              {
                key: 'modulo',
                header: 'Módulo',
                render: (r) => <Badge>{etiquetaModulo(r.modulo)}</Badge>,
              },
              {
                key: 'accion',
                header: 'Acción',
                render: (r) => <Badge className={TONO[tonoAccion(r.accion)]}>{etiquetaAccion(r)}</Badge>,
              },
              {
                key: 'registro',
                header: 'Registro afectado',
                render: (r) =>
                  r.entidad ? (
                    <button
                      type="button"
                      className={clsx('text-left text-xs hover:underline', esCiInexistente(r) && 'text-amber-700')}
                      title="Ver el historial de este registro"
                      onClick={() => historialDe(r)}
                    >
                      {describirRegistro(r)}
                    </button>
                  ) : (
                    '—'
                  ),
              },
              {
                key: 'ver',
                header: '',
                render: (r) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Eye}
                    onClick={() => setVer(r)}
                    aria-label="Ver detalle"
                    title="Ver detalle"
                  />
                ),
              },
            ]}
          />
          {data && total > 0 && (
            <div className="mt-3">
              <Paginacion
                pagina={pagina}
                porPagina={POR_PAGINA}
                total={total}
                cargando={loading}
                onCambiar={(p) => ir(f, p)}
              />
            </div>
          )}
        </>
      )}
      {ver && <ModalDetalle r={ver} onCerrar={() => setVer(null)} />}
    </>
  );
}
