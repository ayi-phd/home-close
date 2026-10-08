export function ProgressRing({ value, label, sub }: { value: number; label: string; sub: string }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div className="ring" role="img" aria-label={`${label} ${sub}`}>
      <svg viewBox="0 0 84 84" aria-hidden="true">
        <circle className="track" cx="42" cy="42" r={r} fill="none" strokeWidth="8" />
        <circle
          className="value"
          cx="42"
          cy="42"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference * pct} ${circumference}`}
        />
      </svg>
      <div className="lbl2" aria-hidden="true">
        <div>
          {label}
          <small>{sub}</small>
        </div>
      </div>
    </div>
  );
}
