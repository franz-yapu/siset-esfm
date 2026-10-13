import { useState } from 'react';
import { KeyRound, Pencil, UserCheck, UserPlus, UserX } from 'lucide-react';
import type { Rol, Usuario } from '@/types';
import { useAccion, useAsync, useUsuario } from '@/hooks';
import {
  estadoUsuario,
  usuariosService,
  type DatosUsuario,
  type EstadoUsuario,
  type FiltrosUsuarios,
} from '@/services/usuarios.service';
import { ROLES } from '@/config/permisos';
import { SEDES, sedeCorta } from '@/config/catalogos';
import { fechaHora } from '@/lib/formato';
import { Badge, Button, DataTable, Input, Modal, PageHeader, RolBadge, Select } from '@/components/ui';
import { Confirmar } from '@/components/hojas/Confirmar';

const ESTILO_ESTADO: Record<EstadoUsuario, string> = {
  Activo: 'bg-green-50 text-green-700 ring-green-300',
  Inactivo: 'bg-slate-100 text-slate-600 ring-slate-300',
  Bloqueado: 'bg-red-50 text-red-700 ring-red-300',
};

type Pendiente = { tipo: 'reset' | 'baja' | 'alta'; u: Usuario } | null;

/** P-47 · Usuarios (KARDEX). */
export function Usuarios() {
  const yo = useUsuario();
  const [f, setF] = useState<FiltrosUsuarios>({ texto: '', rol: '', estado: '' });
  const [form, setForm] = useState<Usuario | 'nuevo' | null>(null);
  const [pend, setPend] = useState<Pendiente>(null);
  const { ejecutar, ocupado } = useAccion();
  const { data = [], loading, reload } = useAsync(() => usuariosService.listar(f), [f.texto, f.rol, f.estado]);

  const confirmar = async () => {
    if (!pend) return;
    const { tipo, u } = pend;
    const ok = await ejecutar(
      () =>
        tipo === 'reset'
          ? usuariosService.resetearClave(u.id, yo)
          : usuariosService.cambiarActivo(u.id, tipo === 'alta', yo),
      tipo === 'reset'
        ? `Contraseña reseteada: ${u.usuario} deberá cambiarla al ingresar`
        : tipo === 'alta'
          ? 'Usuario reactivado'
          : 'Usuario dado de baja',
    );
    if (ok) {
      setPend(null);
      reload();
    }
  };

  return (
    <>
      <PageHeader
        titulo="Usuarios"
        subtitulo={`${data.length} usuarios`}
        acciones={
          <Button icon={UserPlus} onClick={() => setForm('nuevo')}>
            Nuevo usuario
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <Input
          label="Buscar"
          placeholder="CI, usuario o nombre"
          value={f.texto}
          onChange={(e) => setF({ ...f, texto: e.target.value })}
        />
        <Select label="Rol" value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value as Rol | '' })}>
          <option value="">Todos</option>
          {(Object.keys(ROLES) as Rol[]).map((r) => (
            <option key={r} value={r}>
              {ROLES[r].nombre}
            </option>
          ))}
        </Select>
        <Select
          label="Estado"
          value={f.estado}
          onChange={(e) => setF({ ...f, estado: e.target.value as EstadoUsuario | '' })}
        >
          <option value="">Todos</option>
          <option>Activo</option>
          <option>Inactivo</option>
          <option>Bloqueado</option>
        </Select>
      </div>
      <DataTable
        data={data}
        loading={loading}
        rowKey={(u) => u.id}
        columns={[
          {
            key: 'usuario',
            header: 'CI / Usuario',
            sortValue: (u) => u.usuario,
            render: (u) => <code>{u.usuario}</code>,
          },
          {
            key: 'nombre',
            header: 'Nombre',
            principal: true,
            sortValue: (u) => u.nombre,
            render: (u) => <span className="font-medium">{u.nombre}</span>,
          },
          { key: 'rol', header: 'Rol', render: (u) => <RolBadge rol={u.rol} /> },
          { key: 'sede', header: 'Sede', render: (u) => sedeCorta(u.sedeId) },
          {
            key: 'estado',
            header: 'Estado',
            render: (u) => <Badge className={ESTILO_ESTADO[estadoUsuario(u)]}>{estadoUsuario(u)}</Badge>,
          },
          {
            key: 'acceso',
            header: 'Último acceso',
            sortValue: (u) => u.ultimoAcceso ?? '',
            render: (u) => fechaHora(u.ultimoAcceso),
          },
          {
            key: 'acciones',
            header: '',
            render: (u) => (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Pencil}
                  onClick={() => setForm(u)}
                  aria-label="Editar"
                  title="Editar"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={KeyRound}
                  onClick={() => setPend({ tipo: 'reset', u })}
                  aria-label="Resetear contraseña"
                  title="Resetear contraseña"
                />
                {u.activo ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={UserX}
                    disabled={u.id === yo.id}
                    onClick={() => setPend({ tipo: 'baja', u })}
                    aria-label="Dar de baja"
                    title="Dar de baja"
                    className="text-red-600"
                  />
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={UserCheck}
                    onClick={() => setPend({ tipo: 'alta', u })}
                    aria-label="Reactivar"
                    title="Reactivar"
                    className="text-green-700"
                  />
                )}
              </div>
            ),
          },
        ]}
      />

      {form && (
        <ModalUsuario
          usuario={form === 'nuevo' ? null : form}
          onCerrar={() => setForm(null)}
          onGuardado={() => {
            setForm(null);
            reload();
          }}
        />
      )}
      <Confirmar
        abierto={pend !== null}
        cargando={ocupado}
        onCerrar={() => setPend(null)}
        onConfirmar={confirmar}
        peligro={pend?.tipo === 'baja'}
        titulo={
          pend?.tipo === 'reset' ? 'Resetear contraseña' : pend?.tipo === 'baja' ? 'Dar de baja' : 'Reactivar usuario'
        }
        textoConfirmar={pend?.tipo === 'baja' ? 'Dar de baja' : 'Confirmar'}
      >
        {pend?.tipo === 'baja' && (
          <>
            El usuario <strong>{pend.u.nombre}</strong> no podrá ingresar. Sus registros se conservan.
          </>
        )}
        {pend?.tipo === 'reset' && (
          <>
            Se asignará una contraseña temporal a <strong>{pend.u.nombre}</strong> y deberá cambiarla en su próximo
            ingreso.
          </>
        )}
        {pend?.tipo === 'alta' && (
          <>
            <strong>{pend?.u.nombre}</strong> podrá volver a ingresar al sistema.
          </>
        )}
      </Confirmar>
    </>
  );
}

function ModalUsuario({
  usuario,
  onCerrar,
  onGuardado,
}: {
  usuario: Usuario | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const yo = useUsuario();
  const { ejecutar, ocupado } = useAccion();
  const [d, setD] = useState<DatosUsuario>(
    usuario
      ? {
          usuario: usuario.usuario,
          nombre: usuario.nombre,
          correo: usuario.correo ?? '',
          rol: usuario.rol,
          sedeId: usuario.sedeId,
        }
      : { usuario: '', nombre: '', correo: '', rol: 'SEC_COORD', sedeId: 2 },
  );
  const [enviado, setEnviado] = useState(false);
  const personal = d.rol !== 'ESTUDIANTE' && d.rol !== 'EGRESADO';
  const err = {
    usuario: !d.usuario.trim() ? 'Obligatorio' : null,
    nombre: !d.nombre.trim() ? 'Obligatorio' : null,
    correo: d.correo && !/^\S+@\S+\.\S+$/.test(d.correo) ? 'Correo inválido' : null,
  };
  const guardar = async () => {
    setEnviado(true);
    if (err.usuario || err.nombre || err.correo) return;
    const datos = { ...d, sedeId: personal ? d.sedeId : null };
    const ok = await ejecutar(
      () => (usuario ? usuariosService.editar(usuario.id, datos, yo) : usuariosService.crear(datos, yo)),
      usuario ? 'Usuario actualizado' : 'Usuario creado (deberá cambiar su contraseña al ingresar)',
    );
    if (ok) onGuardado();
  };
  return (
    <Modal
      open
      onClose={onCerrar}
      title={usuario ? 'Editar usuario' : 'Nuevo usuario'}
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button loading={ocupado} onClick={guardar}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nombre completo"
          className="sm:col-span-2"
          value={d.nombre}
          onChange={(e) => setD({ ...d, nombre: e.target.value })}
          error={enviado ? err.nombre : null}
        />
        <Input
          label="CI / usuario"
          value={d.usuario}
          onChange={(e) => setD({ ...d, usuario: e.target.value })}
          error={enviado ? err.usuario : null}
        />
        <Input
          label="Correo"
          type="email"
          value={d.correo}
          onChange={(e) => setD({ ...d, correo: e.target.value })}
          error={enviado ? err.correo : null}
        />
        <Select label="Rol" value={d.rol} onChange={(e) => setD({ ...d, rol: e.target.value as Rol })}>
          {(Object.keys(ROLES) as Rol[]).map((r) => (
            <option key={r} value={r}>
              {ROLES[r].nombre}
            </option>
          ))}
        </Select>
        <Select
          label="Sede"
          value={d.sedeId ?? ''}
          disabled={!personal}
          onChange={(e) => setD({ ...d, sedeId: Number(e.target.value) })}
        >
          {!personal && <option value="">—</option>}
          {SEDES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}
