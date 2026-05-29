/**
 * Small shared UI primitives for the Design panels, so each feature panel
 * stays focused on its own logic and the workspace looks consistent.
 */
import { useMemo, type ReactNode } from 'react';
import { cn } from '../ui/cn';
import { withHtmlSecurityMeta, sanitizeSvg } from '../security/sanitize';

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle != null && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type BtnVariant = 'primary' | 'ghost' | 'danger';

export function Btn({
  children,
  onClick,
  variant = 'ghost',
  type = 'button',
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  type?: 'button' | 'submit';
  disabled?: boolean;
  title?: string;
}): React.ReactElement {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-300',
    ghost: 'border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50',
    danger: 'border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed',
        styles[variant]
      )}
    >
      {children}
    </button>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  label,
  type = 'text',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  type?: string;
}): React.ReactElement {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900',
          'focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300',
          label == null && 'mt-0'
        )}
      />
    </label>
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  mono,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
}): React.ReactElement {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900',
        'focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300',
        mono === true && 'font-mono text-xs'
      )}
    />
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
}): React.ReactElement {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', tones[tone])}>
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-4', className)}>{children}</div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

/**
 * Sandboxed preview of an HTML or SVG body, reusing the studio's defense-in-
 * depth: HTML renders in a null-origin iframe with a strict CSP; SVG is
 * sanitized before inline mount.
 */
export function PreviewFrame({
  body,
  kind = 'html',
  className,
}: {
  body: string;
  kind?: 'html' | 'svg';
  className?: string;
}): React.ReactElement {
  const srcDoc = useMemo(() => withHtmlSecurityMeta(body), [body]);
  const safeSvg = useMemo(() => (kind === 'svg' ? sanitizeSvg(body) : ''), [body, kind]);
  if (kind === 'svg') {
    return (
      <div
        className={cn('flex items-center justify-center bg-white p-4', className)}
        // eslint-disable-next-line react/no-danger -- sanitized above via sanitizeSvg
        dangerouslySetInnerHTML={{ __html: safeSvg }}
      />
    );
  }
  return (
    <iframe
      title="Design preview"
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      className={cn('w-full border-0 bg-white', className)}
    />
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }): React.ReactElement {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
