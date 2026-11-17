'use client';

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
} from 'react';

export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');

const FIELD =
  'min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-text placeholder:text-muted focus:outline-2 focus:outline-accent';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  busy?: boolean;
};

export const Button = ({
  variant = 'primary',
  busy,
  className,
  children,
  ...props
}: ButtonProps) => (
  <button
    {...props}
    aria-busy={busy}
    disabled={props.disabled === true || busy === true}
    className={cx(
      'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-medium transition-opacity disabled:opacity-60',
      variant === 'primary' && 'bg-accent text-accent-text',
      variant === 'secondary' && 'border border-border bg-surface text-text',
      variant === 'danger' && 'border border-danger bg-surface text-danger',
      className,
    )}
  >
    {children}
  </button>
);

export const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) => (
  <label className="block space-y-1.5">
    <span className="text-sm font-medium text-muted">{label}</span>
    {children}
    {error && <span className="block text-sm text-danger">{error}</span>}
  </label>
);

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cx(FIELD, className)} />
);

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={cx(FIELD, 'py-2', className)} />
);

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={cx(FIELD, className)} />
);

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cx('rounded-xl border border-border bg-surface', className)}>{children}</div>
);

export const Badge = ({ color, children }: { color: string; children: ReactNode }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-sm"
    style={{ color }}
  >
    <span className="size-2 rounded-full" style={{ background: color }} />
    {children}
  </span>
);

export const ErrorNote = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
    {children}
  </p>
);

export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="px-4 py-10 text-center text-muted">{children}</p>
);

export const PageHeader = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

// A dialog over the page; closes on Escape and on a click outside.
export const Sheet = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 sm:max-w-lg sm:rounded-2xl"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button aria-label="Close" className="px-2 text-2xl text-muted" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
