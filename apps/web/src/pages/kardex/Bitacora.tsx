import { useState } from 'react';
import { Eye, Lock } from 'lucide-react';
import clsx from 'clsx';
import type { RegistroBitacora } from '@/types';
import { useAsync } from '@/hooks';
import { bitacoraService, type FiltrosBitacora } from '@/services/bitacora.service';
import { fechaHora } from '@/lib/formato';
import { Alerta, Badge, Button, DataTable, Input, Modal, PageHeader, Select } from '@/components/ui';

/** P-48 · Bitácora de auditoría (solo lectura). */
export function Bitacora() {
  const [f, setF] = useState<FiltrosBitacora>({ desde: '', hasta: '', usuario: '', modulo: '', accion: '' });
  const [ver, setVer] = useState<RegistroBitacora | null>(null);
  const { data = [], loading } = useAsync(
    () => bitacoraService.listar(f),
    [f.desde, f.hasta, f.usuario, f.modulo, f.accion],
  );
  const op = bitacoraService.opciones();
  const set = (p: Partial<FiltrosBitacora>) => setF({ ...f, ...p });

  return (
    <>
      <PageHeader titulo="Bitácora de auditoría" subtitulo={`${data.length} registros`} />
      <Alerta tipo="info" className="mb-4">
        <span className="inline-flex items-center gap-1">
          <Lock className="size-4" />
          Registro de solo lectura. No se puede modificar ni borrar.
        </span>
      </Alerta>
      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input label="Desde" type="date" value={f.desde} onChange={(e) => set({ desde: e.target.value })} />
        <Input label="Hasta" type="date" value={f.hasta} onChange={(e) => set({ hasta: e.target.value })} />
        <Select label="Usuario" value={f.usuario} onChange={(e) => set({ usuario: e.target.value })}>
          <option value="">Todos</option>
          {op.usuarios.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </Select>
        <Select label="Módulo" value={f.modulo} onChange={(e) => set({ modulo: e.target.value })}>
          <option value="">Todos</option>
          {op.modulos.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
        <Input
          label="Acción"
          placeholder="ej. bloquear"
          value={f.accion}
          onChange={(e) => set({ accion: e.target.value })}
        />
      </div>
      <DataTable
        data={data}
        loading={loading}
        rowKey={(r) => r.id}
        pageSize={15}
        columns={[
          { key: 'fecha', header: 'Fecha y hora', principal: true, render: (r) => fechaHora(r.fecha) },
          { key: 'usuario', header: 'Usuario' },
          { key: 'ip', header: 'IP', render: (r) => <code className="text-xs">{r.ip}</code> },
          { key: 'modulo', header: 'Módulo', render: (r) => <Badge>{r.modulo}</Badge> },
          { key: 'accion', header: 'Acción' },
          {
            key: 'registro',
            header: 'Registro afectado',
            render: (r) => <code className="text-xs">{r.registro}</code>,
          },
          {
            key: 'ver',
            header: '',
            render: (r) =>
              (r.antes || r.despues) && (
                <Button size="sm" variant="ghost" icon={Eye} onClick={() => setVer(r)}>
                  Ver cambios
                </Button>
              ),
          },
        ]}
      />
      {ver && <ModalCambios r={ver} onCerrar={() => setVer(null)} />}
    </>
  );
}

const texto = (v: unknown): string =>
  v === undefined ? '—' : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);

/** "Antes" y "Después" lado a lado, resaltando en amarillo lo que cambió. */
function ModalCambios({ r, onCerrar }: { r: RegistroBitacora; onCerrar: () => void }) {
  const claves = [...new Set([...Object.keys(r.antes ?? {}), ...Object.keys(r.despues ?? {})])];
  return (
    <Modal
      open
      size="lg"
      onClose={onCerrar}
      title={`${r.accion} · ${r.registro}`}
      footer={
        <Button variant="secondary" onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      <p className="mb-3 text-sm text-slate-500">
        {fechaHora(r.fecha)} · {r.usuario} · IP {r.ip}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Campo</th>
              <th className="px-3 py-2">Antes</th>
              <th className="px-3 py-2">Después</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {claves.map((k) => {
              const a = r.antes?.[k];
              const d = r.despues?.[k];
              const cambio = texto(a) !== texto(d);
              return (
                <tr key={k}>
                  <td className="px-3 py-2 font-medium">{k}</td>
                  <td className={clsx('px-3 py-2 break-all', cambio && 'bg-yellow-100')}>{texto(a)}</td>
                  <td className={clsx('px-3 py-2 break-all', cambio && 'bg-yellow-100')}>{texto(d)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
