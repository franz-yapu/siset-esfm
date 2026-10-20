import type { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ title, actions, children, className, padding = true }: Props) {
  return (
    <section data-tarjeta className={clsx('min-w-0 rounded-[10px] border border-borde bg-white', className)}>
      {(title || actions) && (
        <header className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-regla px-4 py-2.5">
          {title && <h2 className="text-[15px] font-semibold text-tinta">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(padding && 'p-4')}>{children}</div>
    </section>
  );
}
