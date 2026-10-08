import type { SVGProps } from 'react';

const PATHS = {
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></>,
  bill: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  bank: <><path d="M3 10l9-6 9 6" /><path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" /></>,
  activity: <><path d="M4 7h16M4 12h10M4 17h7" /><circle cx="18" cy="17" r="3" /></>,
  scale: <><path d="M12 3v18M6 21h12M5 7h14" /><path d="M5 7l-3 6a3 3 0 006 0zM19 7l-3 6a3 3 0 006 0z" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  out: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  chev: <path d="M9 6l6 6-6 6" />,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
} as const;

const WEIGHT: Partial<Record<IconName, number>> = { check: 3, plus: 2.4, close: 2.2, chev: 2.2 };

export type IconName = keyof typeof PATHS;

export function Icon({ name, size, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={WEIGHT[name] ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Home Close mark. Brand colors are part of the logo artwork. */
export function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--lime)" />
      <path d="M7 15.5L16 8l9 7.5V25H7z" fill="none" stroke="var(--on-lime)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M11.5 18.5l3 3 6-6" fill="none" stroke="var(--on-lime)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <BrandMark />
      <span>Home Close</span>
    </div>
  );
}
