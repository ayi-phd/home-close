import type { ReactNode } from 'react';
import { Brand, Icon } from './Icon';

/** Split auth screen: navy pitch panel with a close preview, form on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <Brand />
        <div className="pitch">
          <h1>
            Close your household books <em>every month.</em>
          </h1>
          <p>Track every recurring bill, record what you paid from which account, and reconcile each checking account to the penny.</p>
        </div>
        <div className="auth-preview" aria-hidden="true">
          <div className="row">
            <span className="eyebrow">October 2026 close</span>
            <span className="count">4 of 7</span>
          </div>
          <div className="bar">
            <i style={{ width: '57%' }} />
          </div>
          <PreviewRow done label="Spectrum · Internet" amount="$79.99" />
          <PreviewRow done label="Amex Blue Cash" amount="$612.40" />
          <PreviewRow label="LADWP · Electricity, Water, Trash" amount="$286.73" />
          <PreviewRow label="Reconcile Chase ••8812" amount="−$84.27" negative />
        </div>
      </aside>
      <main className="auth-main">{children}</main>
    </div>
  );
}

function PreviewRow({ label, amount, done, negative }: { label: string; amount: string; done?: boolean; negative?: boolean }) {
  return (
    <div className="row">
      <span className={`tick ${done ? 'on' : ''}`}>{done && <Icon name="check" />}</span>
      <span className="nm">{label}</span>
      <span className={`num ${negative ? 'neg' : ''}`}>{amount}</span>
    </div>
  );
}
