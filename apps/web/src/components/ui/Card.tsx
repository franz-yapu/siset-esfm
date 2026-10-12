import type { ReactNode } from 'react';
import clsx from 'clsx';

interface Props { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padding?: boolean }

export function Card({ title, actions, children, className, padding = true }: Props) {
  return (
    <section className={clsx('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(padding && 'p-4')}>{children}</div>
    </section>
  );
}
