import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { KeyRound } from 'lucide-react';
import clsx from 'clsx';
import { useAuth, useToast, useUsuario } from '@/hooks';
import { authService } from '@/services/auth.service';
import { combinaLetrasNumerosSimbolos, fuerzaClave, validarClave } from '@/lib/reglas';
import { rutaInicio } from '@/config/permisos';
import { Alerta, Button, Input } from '@/components/ui';

const NIVELES = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte'];
const COLORES = ['bg-red-500', 'bg-amber-500', 'bg-sky-500', 'bg-green-600'];

/** Formulario de nueva contraseña con reglas e indicador de fuerza (P-03 y bloque de P-05). */
export function FormClave({ onListo }: { onListo: () => void }) {
  const usuario = useUsuario();
  const toast = useToast();
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const errorNueva = enviado ? validarClave(nueva) : null;
  const errorRepetir = enviado && nueva !== repetir ? 'Las contraseñas no coinciden' : null;
  const fuerza = fuerzaClave(nueva);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    if (validarClave(nueva) || nueva !== repetir) return;
    setCargando(true);
    try {
      await authService.cambiarClave(usuario, nueva);
      toast.success('Contraseña actualizada');
      setNueva('');
      setRepetir('');
      setEnviado(false);
      onListo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div>
        <Input
          label="Nueva contraseña"
          type="password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          error={errorNueva}
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
        error={errorRepetir}
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

/** P-03 · Cambio de contraseña obligatorio (tras un reseteo de Kardex). */
export function CambiarClave() {
  const { refrescar, usuario } = useAuth();
  const nav = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Cambia tu contraseña</h1>
        <Alerta tipo="aviso" className="my-4">
          Kardex reseteó tu contraseña. Antes de continuar debes elegir una nueva.
        </Alerta>
        <FormClave
          onListo={async () => {
            await refrescar();
            if (usuario) nav(rutaInicio(usuario.rol), { replace: true });
          }}
        />
      </div>
    </div>
  );
}
