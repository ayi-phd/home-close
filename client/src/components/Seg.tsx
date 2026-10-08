import { Link } from 'react-router';

export interface SegOption<T extends string> {
  value: T;
  label: string;
}

/** Segmented control that switches a value (form state). */
export function SegButtons<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? 'on' : ''}
          aria-pressed={o.value === value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Segmented control whose options are links (filters and periods kept in the URL). */
export function SegLinks({ options, label }: { options: { to: string; label: string; active: boolean }[]; label: string }) {
  return (
    <nav className="seg" aria-label={label}>
      {options.map((o) => (
        <Link key={o.to} to={o.to} className={o.active ? 'on' : ''} aria-current={o.active ? 'page' : undefined} preventScrollReset>
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
