import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { KeyRound, LogOut } from 'lucide-react';
import clsx from 'clsx';
import type { Usuario } from '@/types';
import { useAuth, useToast } from '@/hooks';
import { combinaLetrasNumerosSimbolos, fuerzaClave } from '@/lib/reglas';
import { rutaInicio } from '@/config/permisos';
import { Alerta, Button, Input } from '@/components/ui';
import { erroresPorCampo, validarFormClave, type ErroresClave } from './form-clave';

const NIVELES = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte'];
const COLORES = ['bg-red-500', 'bg-amber-500', 'bg-sky-500', 'bg-green-600'];

/**
 * Formulario de cambio de contraseña con reglas e indicador de fuerza (P-03 y bloque de P-05).
 * Pide la actual porque así lo exige la API (DEC-014); la sesión nueva queda en el contexto (SDD S1.9 §2.2).
 */
export function FormClave({ onListo }: { onListo: (usuario: Usuario) => void }) {
  const { cambiarPassword } = useAuth();
  const toast = useToast();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [errorApi, setErrorApi] = useState<ErroresClave>({});
  const [cargando, setCargando] = useState(false);

  const campos = { passwordActual: actual, passwordNueva: nueva, passwordRepetida: repetir };
  const errores: ErroresClave = { ...(enviado ? validarFormClave(campos) : {}), ...errorApi };
  const fuerza = fuerzaClave(nueva);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    setErrorApi({});
    if (Object.keys(validarFormClave(campos)).length > 0) return;
    setCargando(true);
    try {
      const u = await cambiarPassword(actual, nueva);
      toast.success('Contraseña actualizada');
      setActual('');
      setNueva('');
      setRepetir('');
      setEnviado(false);
      onListo(u);
    } catch (err) {
      const { campos: porCampo, general } = erroresPorCampo(err);
      setErrorApi(porCampo);
      if (general) toast.error(general);
    } finally {
      setCargando(false);
    }
  };

  /** Al escribir en un campo se olvida el error que la API puso en él. */
  const editar = (campo: keyof ErroresClave, set: (v: string) => void) => (v: string) => {
    set(v);
    if (!errorApi[campo]) return;
    setErrorApi((previo) => {
      const resto = { ...previo };
      delete resto[campo];
      return resto;
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <Input
        label="Contraseña actual"
        type="password"
        value={actual}
        onChange={(e) => editar('passwordActual', setActual)(e.target.value)}
        error={errores.passwordActual}
        autoComplete="current-password"
      />
      <div>
        <Input
          label="Nueva contraseña"
          type="password"
          value={nueva}
          onChange={(e) => editar('passwordNueva', setNueva)(e.target.value)}
          error={errores.passwordNueva}
          autoComplete="new-password"
        />
        {nueva && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={clsx('h-1.5 flex-1 rounded-full', i < fuerza ? COLORES[fuerza] : 'bg-slate-200')}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">Fuerza: {NIVELES[fuerza]}</p>
          </div>
        )}
      </div>
      <Input
        label="Repetir contraseña"
        type="password"
        value={repetir}
        onChange={(e) => setRepetir(e.target.value)}
        error={errores.passwordRepetida}
        autoComplete="new-password"
      />
      <ul className="space-y-1 text-xs text-slate-500">
        <li className={nueva.length >= 8 ? 'text-green-700' : ''}>• Mínimo 8 caracteres</li>
        <li className={combinaLetrasNumerosSimbolos(nueva) ? 'text-green-700' : ''}>• Letras, números y símbolos</li>
      </ul>
      <Button type="submit" icon={KeyRound} loading={cargando}>
        Guardar contraseña
      </Button>
    </form>
  );
}

/** P-03 · Cambio de contraseña obligatorio (cuenta nueva o contraseña restablecida por Kardex). */
export function CambiarClave() {
  const { logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Cambia tu contraseña</h1>
        <Alerta tipo="aviso" className="my-4">
          Tu contraseña es temporal (la asignó Kardex). Antes de continuar, elige una nueva.
        </Alerta>
        <FormClave onListo={(u) => nav(rutaInicio(u.rol), { replace: true })} />
        <Button
          variant="ghost"
          icon={LogOut}
          className="mt-4 w-full"
          onClick={async () => {
            await logout();
            nav('/login', { replace: true });
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
