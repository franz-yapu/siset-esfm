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
    'block min-h-9 w-full rounded-md border bg-white px-3 py-1.5 text-sm text-tinta placeholder:text-[#6b7280] focus:ring-2 focus:outline-none disabled:bg-[#f5f7fa] disabled:text-suave',
    error ? 'border-[#c4242a] focus:ring-[#c4242a]/20' : 'border-control focus:border-acento focus:ring-acento/20',
  );

function Envoltura({ id, label, error, hint, className, children }: Base & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-tinta">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-[13px] text-[#b4232a]">{error}</p>
      ) : (
        hint && <p className="mt-1 text-[13px] text-suave">{hint}</p>
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
