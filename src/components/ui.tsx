'use client';

import { useEffect, useId, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Printer,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { STATUSES, type Status } from '@/lib/types';

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'dark' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] font-heading font-bold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes: Record<ButtonSize, string> = {
    sm: 'min-h-9 px-3.5 py-1.5 text-sm',
    md: 'min-h-11 px-5 py-2.5 text-[15px]',
  };
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand border-transparent text-white hover:bg-brand-600',
    dark: 'bg-ink border-transparent text-white hover:bg-ink-2',
    outline: 'bg-white border-ink text-ink hover:bg-ink hover:text-white',
    ghost: 'bg-transparent border-transparent text-ink-2 hover:bg-ink/5',
    danger: 'bg-status-rejected border-transparent text-white hover:bg-red-800',
  };
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({ variant, size, loading, className = '', children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  className = '',
  children,
  ...rest
}: { href: string; variant?: ButtonVariant; size?: ButtonSize; className?: string; children: ReactNode; target?: string; rel?: string }) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  icon: Icon,
  className = '',
  ...rest
}: { label: string; icon: LucideIcon } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-ink-2 hover:bg-ink/5 transition-colors ${className}`}
      {...rest}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Layout pieces                                                       */
/* ------------------------------------------------------------------ */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-line rounded-2xl shadow-card ${className}`}>{children}</div>;
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-heading text-xs font-bold uppercase tracking-[0.12em] text-brand-600 ${className}`}>
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
        {description && <p className="text-[15px] text-muted max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
}: { label: string; value: ReactNode; hint?: string; icon: LucideIcon; tone?: 'neutral' | 'brand' | 'accent' }) {
  const iconTone = {
    neutral: 'bg-soft text-ink-2',
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-accent-50 text-accent-700',
  }[tone];
  return (
    <Card className="p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="font-heading text-3xl font-extrabold text-ink mt-1 tabular-nums">{value}</p>
        {hint && <p className="text-sm text-muted mt-1">{hint}</p>}
      </div>
      <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${iconTone}`}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

type AlertTone = 'error' | 'warning' | 'info' | 'success';

export function Alert({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
}: { tone?: AlertTone; title?: string; children?: ReactNode; action?: ReactNode; onDismiss?: () => void }) {
  const styles: Record<AlertTone, { box: string; icon: LucideIcon }> = {
    error: { box: 'bg-status-rejected-bg/60 border-red-200 text-red-900', icon: AlertCircle },
    warning: { box: 'bg-status-pending-bg/60 border-amber-200 text-amber-900', icon: AlertTriangle },
    info: { box: 'bg-accent-50 border-accent/20 text-accent-700', icon: Info },
    success: { box: 'bg-status-ready-bg/60 border-emerald-200 text-emerald-900', icon: CheckCircle2 },
  };
  const { box, icon: Icon } = styles[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm ${box}`}>
      <Icon className="w-5 h-5 shrink-0 mt-px" aria-hidden="true" />
      <div className="flex-1 min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
        {action && <div className="pt-1">{action}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="p-1 -m-1 rounded-lg hover:bg-black/5">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-muted" role="status">
      <Loader2 className="w-7 h-7 animate-spin text-brand" aria-hidden="true" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      <div className="w-12 h-12 rounded-2xl bg-soft text-muted flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <p className="font-heading font-bold text-ink">{title}</p>
      {description && <p className="text-sm text-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export const STATUS_META: Record<Status, { label: string; icon: LucideIcon; text: string; bg: string; bar: string }> = {
  Pending: { label: 'Pending', icon: Clock, text: 'text-status-pending', bg: 'bg-status-pending-bg', bar: 'bg-amber-500' },
  Printing: { label: 'Printing', icon: Printer, text: 'text-status-printing', bg: 'bg-status-printing-bg', bar: 'bg-accent' },
  Ready: { label: 'Ready', icon: CheckCircle2, text: 'text-status-ready', bg: 'bg-status-ready-bg', bar: 'bg-emerald-600' },
  Rejected: { label: 'Rejected', icon: XCircle, text: 'text-status-rejected', bg: 'bg-status-rejected-bg', bar: 'bg-red-600' },
};

function statusMeta(status: string) {
  return STATUS_META[(STATUSES as readonly string[]).includes(status) ? (status as Status) : 'Pending'];
}

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ${meta.bg} ${meta.text}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/**
 * Status dropdown. `onChange` returns a promise; while it runs the new value is shown with a
 * spinner, and if it rejects the select falls back to the saved value.
 */
export function StatusSelect({
  value,
  onChange,
  label,
  disabled,
}: { value: string; onChange: (status: Status) => Promise<void>; label: string; disabled?: boolean }) {
  const [pending, setPending] = useState<string | null>(null);
  const shown = pending ?? value;
  const meta = statusMeta(shown);

  const handle = async (next: Status) => {
    setPending(next);
    try {
      await onChange(next);
    } catch {
      // The parent reports the error; we only revert the visible value.
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <select
        aria-label={label}
        value={shown}
        disabled={disabled || pending !== null}
        onChange={(e) => handle(e.target.value as Status)}
        className={`appearance-none cursor-pointer rounded-full border border-transparent pl-3 pr-8 py-1.5 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-wait ${meta.bg} ${meta.text}`}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <span className={`pointer-events-none absolute right-2.5 ${meta.text}`} aria-hidden="true">
        {pending !== null ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '▾'}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

const inputBase =
  'w-full min-h-11 rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-soft';

export function TextField({
  label,
  hint,
  error,
  required,
  className = '',
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink-2 mb-1.5">
        {label}
        {required && <span className="text-brand-600" aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputBase} ${error ? 'border-red-400' : ''}`}
        {...rest}
      />
      {hint && !error && <p id={`${id}-hint`} className="text-[13px] text-muted mt-1.5">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-[13px] text-status-rejected mt-1.5">{error}</p>}
    </div>
  );
}

export function SelectField({
  label,
  required,
  children,
  className = '',
  ...rest
}: { label: string; required?: boolean; children: ReactNode; className?: string } & Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'className'
>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink-2 mb-1.5">
        {label}
        {required && <span className="text-brand-600" aria-hidden="true"> *</span>}
      </label>
      <select id={id} required={required} className={inputBase} {...rest}>
        {children}
      </select>
    </div>
  );
}

/** Compact filter inputs for table toolbars (label is visually hidden). */
export const filterInputClass =
  'min-h-10 rounded-xl border border-line-strong bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15';

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Modal dialog: closes on Esc or backdrop click, keeps keyboard focus inside, restores focus on close. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    (focusables()[0] ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  const width = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={() => onCloseRef.current()} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${width} max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-dialog p-6 sm:p-7 outline-none`}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-ink">{title}</h2>
            {description && <p className="text-sm text-muted mt-1">{description}</p>}
          </div>
          <IconButton label="Close" icon={X} onClick={() => onCloseRef.current()} className="-mr-2 -mt-2" />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';
}

/** Employee photo thumbnail; falls back to initials if the image fails. Click opens a larger view. */
export function PhotoThumb({ src, name, size = 40 }: { src: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(!src);
  const [open, setOpen] = useState(false);
  const style = { width: size, height: size };

  if (failed) {
    return (
      <span
        style={style}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 font-heading font-bold text-sm"
        aria-label={`No photo for ${name}`}
        role="img"
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full focus-visible:outline-2"
        aria-label={`View photo of ${name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          style={style}
          className="rounded-full object-cover border border-line bg-soft"
          onError={() => setFailed(true)}
        />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={name} size="sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Photo of ${name}`} className="w-full rounded-2xl object-cover bg-soft" />
      </Dialog>
    </>
  );
}
