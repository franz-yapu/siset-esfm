import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icono: Icono = Inbox,
  titulo,
  texto,
  children,
}: {
  icono?: LucideIcon;
  titulo: string;
  texto?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <Icono className="mb-2 size-5 text-suave" strokeWidth={1.75} aria-hidden />
      <p className="text-sm font-medium text-tinta">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-suave">{texto}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
