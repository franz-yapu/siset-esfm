import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

type Variante = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

const ESTILOS: Record<Variante, string> = {
  primary: 'bg-primario text-white hover:bg-primario-oscuro disabled:bg-slate-300',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
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
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento disabled:cursor-not-allowed',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm',
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
