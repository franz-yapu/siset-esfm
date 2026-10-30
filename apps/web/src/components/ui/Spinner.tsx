import clsx from 'clsx';

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={clsx(
        'inline-block animate-spin rounded-full border-2 border-current border-r-transparent',
        size === 'sm' ? 'size-4' : size === 'md' ? 'size-6' : 'size-10',
        className,
      )}
    />
  );
}

/** Bloque de carga para pantallas mientras responde el servicio. */
export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="entrada-carga flex items-center justify-center gap-3 py-16 text-suave">
      <Spinner className="text-acento" /> <span className="text-sm">{texto}</span>
    </div>
  );
}

export function Esqueleto({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-md bg-slate-200', className)} />;
}
