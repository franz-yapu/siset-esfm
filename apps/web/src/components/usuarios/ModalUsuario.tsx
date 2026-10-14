import { useState } from 'react';
import type { Usuario } from '@/types';
import {
  ROLES_PERSONAL,
  esRolPersonal,
  type CambiosUsuario,
  type DatosCrearUsuario,
  type RolPersonal,
  type UsuarioConPassword,
  type UsuarioDetalle,
} from '@/types/usuarios';
import { usuariosService } from '@/services/usuarios.service';
import { useMutacionUsuarios } from '@/hooks/useUsuarios';
import { useToast } from '@/hooks';
import { ROLES } from '@/config/permisos';
import { SEDES } from '@/config/catalogos';
import {
  erroresDelFormulario,
  normalizarDatosUsuario,
  validarDatosUsuario,
  type CampoUsuario,
  type ErroresFormulario,
} from '@/lib/usuarios';
import { Alerta, Button, Input, Modal, Select } from '@/components/ui';

interface Props {
  /** `null`: crear. */
  usuario: UsuarioDetalle | null;
  yo: Usuario;
  onCerrar: () => void;
  /** Crear devuelve la contraseña temporal, que muestra quien abrió el modal. */
  onCreado: (r: UsuarioConPassword) => void;
  onEditado: () => void;
}

interface Formulario {
  ci: string;
  complemento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  celular: string;
  rol: RolPersonal;
  sedeId: number;
}

const inicial = (u: UsuarioDetalle | null, yo: Usuario): Formulario => ({
  ci: u?.ci ?? '',
  complemento: u?.complemento ?? '',
  nombres: u?.nombres ?? '',
  apellidoPaterno: u?.apellidoPaterno ?? '',
  apellidoMaterno: u?.apellidoMaterno ?? '',
  email: u?.email ?? '',
  celular: u?.celular ?? '',
  rol: u && esRolPersonal(u.rol) ? u.rol : 'SEC_COORD',
  // D-24: el personal es de una sede; por defecto, la del Kardex que crea.
  sedeId: u?.sedeId ?? yo.sedeId ?? SEDES[0].id,
});

const aDatos = (f: Formulario): DatosCrearUsuario => normalizarDatosUsuario({ ...f });

/** Solo los campos que cambiaron (PATCH, SDD S1.13 §2.4). */
const cambiosDe = (antes: DatosCrearUsuario, despues: DatosCrearUsuario): CambiosUsuario => {
  const c: Record<string, unknown> = {};
  for (const k of ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'email', 'celular', 'rol', 'sedeId'] as const) {
    if (antes[k] !== despues[k]) c[k] = despues[k];
  }
  return c as CambiosUsuario;
};

const SIN_ERRORES: ErroresFormulario = { campos: {}, general: null };

/** P-47 · Crear / editar usuario del personal. El CI no se edita (DEC-020 #3). */
export function ModalUsuario({ usuario, yo, onCerrar, onCreado, onEditado }: Props) {
  const toast = useToast();
  const [f, setF] = useState<Formulario>(() => inicial(usuario, yo));
  const [errores, setErrores] = useState<ErroresFormulario>(SIN_ERRORES);
  const crear = useMutacionUsuarios((d: DatosCrearUsuario) => usuariosService.crear(d, yo));
  const editar = useMutacionUsuarios((c: CambiosUsuario) => usuariosService.editar(usuario?.id ?? 0, c, yo));
  const ocupado = crear.isPending || editar.isPending;
  const propio = usuario?.id === yo.id;

  const cambiar = <K extends keyof Formulario>(k: K, v: Formulario[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    if (errores.campos[k]) setErrores((e) => ({ ...e, campos: { ...e.campos, [k]: undefined } }));
  };
  const error = (c: CampoUsuario) => errores.campos[c] ?? null;

  const guardar = async () => {
    const datos = aDatos(f);
    const campos = validarDatosUsuario(datos);
    if (Object.keys(campos).length) {
      setErrores({ campos, general: null });
      return;
    }
    setErrores(SIN_ERRORES);
    try {
      if (!usuario) {
        onCreado(await crear.mutateAsync(datos));
        return;
      }
      const cambios = cambiosDe(aDatos(inicial(usuario, yo)), datos);
      if (!Object.keys(cambios).length) {
        toast.success('Sin cambios');
        onCerrar();
        return;
      }
      await editar.mutateAsync(cambios);
      toast.success('Usuario actualizado');
      onEditado();
    } catch (e) {
      setErrores(erroresDelFormulario(e));
    }
  };

  return (
    <Modal
      open
      onClose={onCerrar}
      title={usuario ? 'Editar usuario' : 'Nuevo usuario'}
      size="lg"
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
      {errores.general && (
        <Alerta tipo="error" className="mb-4">
          {errores.general}
        </Alerta>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Nombres"
          value={f.nombres}
          onChange={(e) => cambiar('nombres', e.target.value)}
          error={error('nombres')}
          maxLength={80}
        />
        <Input
          label="Apellido paterno"
          value={f.apellidoPaterno}
          onChange={(e) => cambiar('apellidoPaterno', e.target.value)}
          error={error('apellidoPaterno')}
          maxLength={60}
        />
        <Input
          label="Apellido materno"
          value={f.apellidoMaterno}
          onChange={(e) => cambiar('apellidoMaterno', e.target.value)}
          error={error('apellidoMaterno')}
          maxLength={60}
        />
        <Input
          label="CI"
          inputMode="numeric"
          value={f.ci}
          disabled={Boolean(usuario)}
          onChange={(e) => cambiar('ci', e.target.value)}
          error={error('ci')}
          hint={usuario ? 'El CI no se edita: si está mal, dé de baja la cuenta y cree otra.' : 'Será su usuario.'}
          maxLength={15}
        />
        <Input
          label="Complemento"
          value={f.complemento}
          disabled={Boolean(usuario)}
          onChange={(e) => cambiar('complemento', e.target.value.toUpperCase())}
          error={error('complemento')}
          hint={usuario ? undefined : 'Opcional.'}
          maxLength={5}
        />
        <Input
          label="Celular"
          inputMode="tel"
          value={f.celular}
          onChange={(e) => cambiar('celular', e.target.value)}
          error={error('celular')}
          maxLength={20}
        />
        <Input
          label="Correo"
          type="email"
          value={f.email}
          onChange={(e) => cambiar('email', e.target.value)}
          error={error('email')}
          hint="Opcional."
          maxLength={120}
        />
        <Select
          label="Rol"
          value={f.rol}
          disabled={propio}
          onChange={(e) => cambiar('rol', e.target.value as RolPersonal)}
          error={error('rol')}
          hint={propio ? 'No puede cambiar su propio rol.' : undefined}
        >
          {ROLES_PERSONAL.map((r) => (
            <option key={r} value={r}>
              {ROLES[r].nombre}
            </option>
          ))}
        </Select>
        <Select
          label="Sede"
          value={f.sedeId}
          onChange={(e) => cambiar('sedeId', Number(e.target.value))}
          error={error('sedeId')}
        >
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
