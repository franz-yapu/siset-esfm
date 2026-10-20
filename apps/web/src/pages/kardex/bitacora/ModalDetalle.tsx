import { Lock } from 'lucide-react';
import clsx from 'clsx';
import type { RegistroAuditoria } from '@/types/bitacora';
import { Button, Modal } from '@/components/ui';
import {
  describirRegistro,
  diferencias,
  etiquetaAccion,
  etiquetaModulo,
  fechaHoraLaPaz,
  textoValor,
} from './presentacion';

const REDACTADO = '[REDACTADO]';

function Valor({ v, presente }: { v: unknown; presente: boolean }) {
  if (v === REDACTADO) {
    return (
      <span className="inline-flex items-center gap-1" title="Dato sensible: no se guarda en la bitácora">
        <Lock className="size-3.5" />
        {REDACTADO}
      </span>
    );
  }
  const t = textoValor(v, presente);
  return typeof v === 'object' && v !== null ? (
    <pre className="text-xs whitespace-pre-wrap">{t}</pre>
  ) : (
    <span className={clsx(!presente || v === null ? 'text-suave italic' : undefined)}>{t}</span>
  );
}

/** "Ver detalle" de P-48: antes y después lado a lado, en amarillo lo que cambió (SDD S6.5 §2.3). */
export function ModalDetalle({ r, onCerrar }: { r: RegistroAuditoria; onCerrar: () => void }) {
  const filas = diferencias(r.antes, r.despues);
  const sinDatos = r.antes == null && r.despues == null;
  return (
    <Modal
      open
      size="lg"
      onClose={onCerrar}
      title={`${etiquetaAccion(r)} · ${describirRegistro(r)}`}
      footer={
        <Button variant="secondary" onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      <dl className="mb-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-suave">Fecha y hora</dt>
        <dd>{fechaHoraLaPaz(r.fecha)} (La Paz)</dd>
        <dt className="text-suave">Usuario</dt>
        <dd>{r.usuario ? `${r.usuario.nombre} · ${r.usuario.usuario}` : 'Sin usuario'}</dd>
        <dt className="text-suave">Módulo</dt>
        <dd>{etiquetaModulo(r.modulo)}</dd>
        <dt className="text-suave">IP</dt>
        <dd>{r.ip ?? '—'}</dd>
        <dt className="text-suave">Navegador</dt>
        <dd className="truncate text-xs text-suave" title={r.userAgent ?? undefined}>
          {r.userAgent ?? '—'}
        </dd>
      </dl>

      {sinDatos ? (
        <p className="text-sm text-suave">Este evento no guarda datos de antes ni después.</p>
      ) : filas ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f5f7fa] text-xs text-suave uppercase">
              <tr>
                <th className="px-3 py-2">Campo</th>
                <th className="px-3 py-2">Antes</th>
                <th className="px-3 py-2">Después</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-regla">
              {filas.map((d) => (
                <tr key={d.campo} className={clsx(d.cambio && 'bg-yellow-100')} data-cambio={d.cambio || undefined}>
                  <td className="px-3 py-2 font-medium">{d.campo}</td>
                  <td className="px-3 py-2 break-all">
                    <Valor v={d.antes} presente={d.enAntes} />
                  </td>
                  <td className="px-3 py-2 break-all">
                    <Valor v={d.despues} presente={d.enDespues} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['Antes', r.antes],
              ['Después', r.despues],
            ] as const
          ).map(([titulo, v]) => (
            <div key={titulo}>
              <p className="mb-1 text-xs font-semibold text-suave uppercase">{titulo}</p>
              <pre className="overflow-x-auto rounded bg-[#f5f7fa] p-2 text-xs">{textoValor(v)}</pre>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
