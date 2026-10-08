/** Colored initials tile for a biller or bank. The color is data (the brand's color), not theme. */
export function BillerLogo({ color, label }: { color: string; label: string }) {
  return (
    <span className="logo" style={{ background: color }} aria-hidden="true">
      {label}
    </span>
  );
}

export function bankInitials(institution: string): string {
  return institution.slice(0, 2).toUpperCase();
}
