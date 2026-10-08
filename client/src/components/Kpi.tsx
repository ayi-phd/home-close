import type { ReactNode } from 'react';

export function Kpi({
  label,
  value,
  sub,
  tone,
  compact,
  meter,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'good' | 'warn';
  compact?: boolean;
  /** 0–1 */
  meter?: number;
}) {
  return (
    <div className="card kpi">
      <span className="eyebrow">{label}</span>
      <span className={['v', 'num', tone, compact && 'compact'].filter(Boolean).join(' ')}>{value}</span>
      {meter != null && (
        <div className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(meter * 100)}>
          <i style={{ width: `${Math.min(1, Math.max(0, meter)) * 100}%` }} />
        </div>
      )}
      {sub != null && <span className="s">{sub}</span>}
    </div>
  );
}

export function KpiRow({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section className="kpis" aria-label={label}>
      {children}
    </section>
  );
}
