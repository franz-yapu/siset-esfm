import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import clsx from 'clsx';

interface Base {
  label?: string;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
}

const control = (error?: string | null) =>
  clsx(
    'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500',
    error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-acento focus:ring-acento/20',
  );

function Envoltura({ id, label, error, hint, className, children }: Base & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, Base & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, error, hint, className, id, ...rest }, ref) => {
    const auto = useId();
    const cid = id ?? auto;
    return (
      <Envoltura id={cid} label={label} error={error} hint={hint} className={className}>
        <input ref={ref} id={cid} aria-invalid={Boolean(error)} className={control(error)} {...rest} />
      </Envoltura>
    );
  },
);
Input.displayName = 'Input';

export function Select({
  label,
  error,
  hint,
  className,
  id,
  children,
  ...rest
}: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <Envoltura id={cid} label={label} error={error} hint={hint} className={className}>
      <select id={cid} aria-invalid={Boolean(error)} className={control(error)} {...rest}>
        {children}
      </select>
    </Envoltura>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className,
  id,
  ...rest
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <Envoltura id={cid} label={label} error={error} hint={hint} className={className}>
      <textarea id={cid} rows={3} aria-invalid={Boolean(error)} className={control(error)} {...rest} />
    </Envoltura>
  );
}
