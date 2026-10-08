import type { ReactNode } from 'react';

/** Top bar (eyebrow, title, actions) and content area inside the app shell. */
export function Page({ title, eyebrow, actions, children }: { title: string; eyebrow?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="titles">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
        </div>
        {actions && <div className="actions">{actions}</div>}
      </header>
      <div className="content">{children}</div>
    </>
  );
}
