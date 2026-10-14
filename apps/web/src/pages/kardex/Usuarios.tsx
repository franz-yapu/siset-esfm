import { useEffect, useState } from 'react';
import { KeyRound, LockOpen, Pencil, UserCheck, UserPlus, UserX } from 'lucide-react';
import {
  ESTADOS_USUARIO,
  ROLES_PERSONAL,
  esRolPersonal,
  type EstadoUsuario,
  type RolPersonal,
  type UsuarioConPassword,
  type UsuarioDetalle,
} from '@/types/usuarios';
import { useToast, useUsuario } from '@/hooks';
import { useMutacionUsuarios, useUsuarios } from '@/hooks/useUsuarios';
import { usuariosService } from '@/services/usuarios.service';
import { ROLES } from '@/config/permisos';
import { SEDES, sedeCorta } from '@/config/catalogos';
import { fechaHora } from '@/lib/formato';
import { Alerta, Badge, Button, DataTable, Input, PageHeader, Paginacion, RolBadge, Select } from '@/components/ui';
import { Confirmar } from '@/components/hojas/Confirmar';
import { ModalUsuario } from '@/components/usuarios/ModalUsuario';
import { ModalPasswordTemporal } from '@/components/usuarios/ModalPasswordTemporal';

const POR_PAGINA = 20;
/** Espera antes de buscar mientras se escribe. */
const ESPERA_BUSQUEDA = 300;

const ESTADO: Record<EstadoUsuario, { texto: string; clase: string }> = {
  ACTIVO: { texto: 'Activo', clase: 'bg-green-50 text-green-700 ring-green-300' },
  INACTIVO: { texto: 'Inactivo', clase: 'bg-slate-100 text-slate-600 ring-slate-300' },
  BLOQUEADO: { texto: 'Bloqueado', clase: 'bg-red-50 text-red-700 ring-red-300' },
};

type TipoAccion = 'restablecer' | 'desbloquear' | 'baja' | 'alta';
type Pendiente = { tipo: TipoAccion; u: UsuarioDetalle } | null;

const TITULO: Record<TipoAccion, string> = {
  restablecer: 'Restablecer contraseña',
  desbloquear: 'Desbloquear cuenta',
  baja: 'Dar de baja',
  alta: 'Reactivar usuario',
};

const EXITO: Record<Exclude<TipoAccion, 'restablecer'>, string> = {
  desbloquear: 'Cuenta desbloqueada',
  baja: 'Usuario dado de baja',
  alta: 'Usuario reactivado',
};

interface Temporal {
  usuario: string;
  nombre: string;
  passwordTemporal: string;
}

const aTemporal = (r: UsuarioConPassword): Temporal => ({
  usuario: r.usuario.usuario,
  nombre: r.usuario.nombre,
  passwordTemporal: r.passwordTemporal,
});

/** P-47 · Usuarios (KARDEX), conectada a /api/v1/usuarios (SDD S1.13). */
export function Usuarios() {
  const yo = useUsuario();
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const [buscado, setBuscado] = useState('');
  const [rol, setRol] = useState<RolPersonal | ''>('');
  const [sedeId, setSedeId] = useState<number | ''>('');
  const [estado, setEstado] = useState<EstadoUsuario | ''>('');
  const [pagina, setPagina] = useState(1);
  const [form, setForm] = useState<UsuarioDetalle | 'nuevo' | null>(null);
  const [pend, setPend] = useState<Pendiente>(null);
  const [temporal, setTemporal] = useState<Temporal | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setBuscado(texto.trim());
      setPagina(1);
    }, ESPERA_BUSQUEDA);
    return () => clearTimeout(t);
  }, [texto]);

  const { data, isPending, isFetching, error } = useUsuarios({
    ...(buscado ? { texto: buscado } : {}),
    ...(rol ? { rol } : {}),
    ...(sedeId ? { sedeId } : {}),
    ...(estado ? { estado } : {}),
    pagina,
    porPagina: POR_PAGINA,
  });

  const accion = useMutacionUsuarios(
    ({ tipo, u }: { tipo: TipoAccion; u: UsuarioDetalle }): Promise<UsuarioDetalle | UsuarioConPassword> => {
      if (tipo === 'restablecer') return usuariosService.restablecerPassword(u.id, yo);
      if (tipo === 'desbloquear') return usuariosService.desbloquear(u.id, yo);
      return tipo === 'baja' ? usuariosService.darDeBaja(u.id, yo) : usuariosService.reactivar(u.id, yo);
    },
  );

  const filtrar =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPagina(1);
    };

  const confirmar = async () => {
    if (!pend) return;
    const { tipo } = pend;
    try {
      const r = await accion.mutateAsync(pend);
      setPend(null);
      if ('passwordTemporal' in r) setTemporal(aTemporal(r));
      else if (tipo !== 'restablecer') toast.success(EXITO[tipo]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error inesperado');
    }
  };

  /** Descarta la contraseña: deja de existir en el estado y en la mutación (SDD S1.13 §2.4). */
  const cerrarTemporal = () => {
    setTemporal(null);
    accion.reset();
  };

  const filas = data?.datos ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <PageHeader
        titulo="Usuarios"
        subtitulo={`${total} usuarios`}
        acciones={
          <Button icon={UserPlus} onClick={() => setForm('nuevo')}>
            Nuevo usuario
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-4">
        <Input
          label="Buscar"
          placeholder="CI o nombre"
          value={texto}
          maxLength={80}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Select label="Rol" value={rol} onChange={(e) => filtrar(setRol)(e.target.value as RolPersonal | '')}>
          <option value="">Todos</option>
          {ROLES_PERSONAL.map((r) => (
            <option key={r} value={r}>
              {ROLES[r].nombre}
            </option>
          ))}
        </Select>
        <Select
          label="Sede"
          value={sedeId}
          onChange={(e) => filtrar(setSedeId)(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">Todas</option>
          {SEDES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </Select>
        <Select
          label="Estado"
          value={estado}
          onChange={(e) => filtrar(setEstado)(e.target.value as EstadoUsuario | '')}
        >
          <option value="">Todos</option>
          {ESTADOS_USUARIO.map((s) => (
            <option key={s} value={s}>
              {ESTADO[s].texto}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <Alerta tipo="error" className="mb-4">
          {error.message}
        </Alerta>
      )}

      <DataTable
        data={filas}
        loading={isPending}
        rowKey={(u) => u.id}
        pageSize={POR_PAGINA}
        columns={[
          {
            key: 'usuario',
            header: 'CI / Usuario',
            render: (u) => <code>{u.usuario}</code>,
          },
          {
            key: 'nombre',
            header: 'Nombre',
            principal: true,
            render: (u) => <span className="font-medium">{u.nombre}</span>,
          },
          { key: 'rol', header: 'Rol', render: (u) => <RolBadge rol={u.rol} /> },
          { key: 'sede', header: 'Sede', render: (u) => sedeCorta(u.sedeId) },
          {
            key: 'estado',
            header: 'Estado',
            render: (u) => <Badge className={ESTADO[u.estado].clase}>{ESTADO[u.estado].texto}</Badge>,
          },
          {
            key: 'acceso',
            header: 'Último acceso',
            render: (u) => fechaHora(u.ultimoAcceso ?? undefined),
          },
          {
            key: 'acciones',
            header: '',
            render: (u) => (
              <div className="flex gap-1">
                {esRolPersonal(u.rol) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Pencil}
                    onClick={() => setForm(u)}
                    aria-label="Editar"
                    title="Editar"
                  />
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  icon={KeyRound}
                  onClick={() => setPend({ tipo: 'restablecer', u })}
                  aria-label="Restablecer contraseña"
                  title="Restablecer contraseña"
                />
                {u.estado === 'BLOQUEADO' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={LockOpen}
                    onClick={() => setPend({ tipo: 'desbloquear', u })}
                    aria-label="Desbloquear"
                    title="Desbloquear"
                  />
                )}
                {u.activo ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={UserX}
                    disabled={u.id === yo.id}
                    onClick={() => setPend({ tipo: 'baja', u })}
                    aria-label="Dar de baja"
                    title={u.id === yo.id ? 'No puede darse de baja a sí mismo' : 'Dar de baja'}
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
      <div className="mt-3">
        <Paginacion pagina={pagina} porPagina={POR_PAGINA} total={total} onCambiar={setPagina} cargando={isFetching} />
      </div>

      {form && (
        <ModalUsuario
          usuario={form === 'nuevo' ? null : form}
          yo={yo}
          onCerrar={() => setForm(null)}
          onCreado={(r) => {
            setForm(null);
            toast.success('Usuario creado');
            setTemporal(aTemporal(r));
          }}
          onEditado={() => setForm(null)}
        />
      )}
      {temporal && <ModalPasswordTemporal {...temporal} onCerrar={cerrarTemporal} />}
      <Confirmar
        abierto={pend !== null}
        cargando={accion.isPending}
        onCerrar={() => setPend(null)}
        onConfirmar={confirmar}
        peligro={pend?.tipo === 'baja'}
        titulo={pend ? TITULO[pend.tipo] : ''}
        textoConfirmar={pend?.tipo === 'baja' ? 'Dar de baja' : 'Confirmar'}
      >
        {pend?.tipo === 'baja' && (
          <>
            El usuario <strong>{pend.u.nombre}</strong> no podrá ingresar. Sus registros se conservan.
          </>
        )}
        {pend?.tipo === 'restablecer' && (
          <>
            Se generará una contraseña temporal para <strong>{pend.u.nombre}</strong>. Deberá cambiarla en su próximo
            ingreso y se cerrarán sus sesiones abiertas.
          </>
        )}
        {pend?.tipo === 'desbloquear' && (
          <>
            <strong>{pend.u.nombre}</strong> podrá volver a intentar ingresar.
          </>
        )}
        {pend?.tipo === 'alta' && (
          <>
            <strong>{pend.u.nombre}</strong> podrá volver a ingresar al sistema.
          </>
        )}
      </Confirmar>
    </>
  );
}
