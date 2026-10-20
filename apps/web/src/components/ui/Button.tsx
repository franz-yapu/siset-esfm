import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

type Variante = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'ghost' | 'success';

const ESTILOS: Record<Variante, string> = {
  // Una sola acción llena por pantalla, en el azul institucional; lo demás, blanco con borde o solo texto.
  primary: 'bg-primario text-white hover:bg-primario-oscuro active:bg-primario-oscuro disabled:bg-[#9aa8b6]',
  secondary:
    'bg-white text-tinta ring-1 ring-inset ring-control hover:bg-[#f5f7fa] active:bg-activo disabled:text-suave disabled:hover:bg-white',
  danger: 'bg-[#c4242a] text-white hover:bg-[#a51d22] disabled:bg-[#e0a1a3]',
  // Lo que abre una acción destructiva: con borde en el color negativo; la confirmación es la que va llena.
  'danger-outline':
    'bg-white text-[#b4232a] ring-1 ring-inset ring-[#e8b4b1] hover:bg-[#fff4f2] disabled:text-[#e0a1a3]',
  success: 'bg-[#247b50] text-white hover:bg-[#1c6140] disabled:bg-[#9cc4ad]',
  ghost: 'text-suave hover:bg-activo hover:text-tinta disabled:text-[#9aa5b1] disabled:hover:bg-transparent',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variante;
  loading?: boolean;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  loading,
  icon: Icono,
  size = 'md',
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento disabled:cursor-not-allowed',
        size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3.5 text-sm',
        ESTILOS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        Icono && <Icono className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
      )}
      {children}
    </button>
  );
}
