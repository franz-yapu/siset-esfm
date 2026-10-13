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
      className={clsx('-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0', className)}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={activa === t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
            activa === t.id
              ? 'border-acento text-acento'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={clsx(
                'rounded-full px-1.5 text-xs tabular-nums',
                activa === t.id ? 'bg-acento text-white' : 'bg-slate-200 text-slate-600',
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
