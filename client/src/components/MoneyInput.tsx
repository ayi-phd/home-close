import type { InputHTMLAttributes } from 'react';

/** Text input with a $ prefix. Values are typed dollars; parse with `parseMoney` at submit. */
export function MoneyInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <div className="input-pre">
      <span aria-hidden="true">$</span>
      <input inputMode="decimal" autoComplete="off" {...props} className="input num" />
    </div>
  );
}
