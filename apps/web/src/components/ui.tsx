import React from 'react';

/* ---------------------------------------------------------------- surface */

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white border border-line rounded-lg ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 px-4 py-3 border-b border-line">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="text-[13px] text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- numbers */

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'teal' | 'amber' | 'rose' | 'grass';
  onClick?: () => void;
}) {
  const toneRing = {
    default: 'border-line',
    teal: 'border-teal/30',
    amber: 'border-amber/30',
    rose: 'border-rose/30',
    grass: 'border-grass/30',
  }[tone];
  const toneText = {
    default: 'text-ink',
    teal: 'text-teal',
    amber: 'text-amber',
    rose: 'text-rose',
    grass: 'text-grass',
  }[tone];

  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`bg-white border ${toneRing} rounded-lg px-4 py-3 text-left w-full ${
        onClick ? 'hover:border-teal/60 transition-colors' : ''
      }`}
    >
      <div className="text-[12.5px] text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold tabular mt-1 ${toneText}`}>{value}</div>
      {hint && <div className="text-[12px] text-gray-400 mt-0.5">{hint}</div>}
    </Tag>
  );
}

/* ---------------------------------------------------------------- status */

const badgeTones: Record<string, string> = {
  present: 'bg-grass-light text-grass border-grass/20',
  absent: 'bg-rose-light text-rose border-rose/20',
  pending: 'bg-amber-light text-amber border-amber/20',
  info: 'bg-teal-light text-teal border-teal/20',
  muted: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function Badge({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: keyof typeof badgeTones;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium border ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): keyof typeof badgeTones {
  const s = (status || '').toUpperCase();
  if (['PRESENT', 'APPROVED', 'SUBMITTED', 'EVALUATED', 'PUBLISHED', 'CONDUCTED', 'PAID', 'ASSIGNED'].includes(s))
    return 'present';
  if (['ABSENT', 'REJECTED', 'NEEDS_COVER', 'OVERDUE', 'F'].includes(s)) return 'absent';
  if (['PENDING', 'LATE', 'ON_LEAVE', 'HALF_DAY', 'MARKS_ENTRY', 'DRAFT'].includes(s)) return 'pending';
  return 'muted';
}

/* ---------------------------------------------------------------- buttons */

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}) {
  const variants = {
    primary: 'bg-teal text-white hover:bg-teal-dark border-teal disabled:bg-teal/50',
    secondary: 'bg-white text-ink hover:bg-canvas border-line',
    ghost: 'bg-transparent text-ink hover:bg-canvas border-transparent',
    danger: 'bg-rose text-white hover:opacity-90 border-rose',
  };
  const sizes = { sm: 'px-2.5 py-1 text-[13px]', md: 'px-3.5 py-2 text-[14px]' };
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- inputs */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[12px] text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full border border-line rounded-md px-3 py-2 text-[14px] bg-white focus:border-teal outline-none';

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className || ''}`} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />;
}

/* ---------------------------------------------------------------- table */

export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="scroll-x">
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="text-left text-gray-500 border-b border-line">
            {head.map((h, i) => (
              <th key={i} className="font-medium px-4 py-2.5 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className = '',
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-2.5 align-middle ${className}`}>
      {children}
    </td>
  );
}

/* ---------------------------------------------------------------- states */

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {hint && <p className="text-[13px] text-gray-500 mt-1 max-w-md mx-auto">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return <div className="px-4 py-10 text-center text-[13.5px] text-gray-500">{label}…</div>;
}

export function ErrorNote({ text }: { text: string }) {
  return (
    <div className="border border-rose/25 bg-rose-light text-rose rounded-md px-3 py-2 text-[13.5px]">
      {text}
    </div>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-amber/25 bg-amber-light text-amber rounded-md px-3 py-2 text-[13.5px]">
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- bars */

export function PercentBar({ value, min = 75 }: { value: number; min?: number }) {
  const below = value < min;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${below ? 'bg-rose' : 'bg-grass'}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className={`tabular text-[13px] w-12 text-right ${below ? 'text-rose font-medium' : 'text-gray-600'}`}>
        {value}%
      </span>
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h1 className="text-[22px] font-semibold text-ink leading-tight">{title}</h1>
        {subtitle && <p className="text-[13.5px] text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
