import clsx from 'clsx';

export interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
  activa: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activa, onChange, className }: Props) {
  return (
    <div
      role="tablist"
      className={clsx('-mx-4 flex gap-5 overflow-x-auto border-b border-borde px-4 sm:mx-0 sm:px-0', className)}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={activa === t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            '-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-acento',
            activa === t.id
              ? 'border-acento font-medium text-acento'
              : 'border-transparent text-suave hover:border-control hover:text-tinta',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={clsx('text-[13px] tabular-nums', activa === t.id ? 'text-acento' : 'text-suave')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
