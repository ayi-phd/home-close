import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Side panel ("drawer") or centered modal. Closes on Escape and on a click outside, keeps focus
 * inside while open and returns it to the opener afterwards. The body (`children`) supplies its
 * own `.db` element, usually a form that the footer buttons submit via `form=`.
 */
export function Dialog({
  variant,
  title,
  sub,
  leading,
  status,
  footer,
  onClose,
  children,
}: {
  variant: 'drawer' | 'modal';
  title: string;
  sub?: ReactNode;
  leading?: ReactNode;
  status?: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = panel.current!;
    const first = root.querySelector<HTMLElement>('.db ' + FOCUSABLE.split(', ').join(', .db ')) ?? root;
    first.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === 'Tab') {
        const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) return;
        const [head, tail] = [items[0]!, items[items.length - 1]!];
        if (e.shiftKey && document.activeElement === head) {
          e.preventDefault();
          tail.focus();
        } else if (!e.shiftKey && document.activeElement === tail) {
          e.preventDefault();
          head.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const Panel = variant === 'drawer' ? 'aside' : 'div';
  return (
    <div
      className={`overlay ${variant === 'modal' ? 'center' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Panel ref={panel} className={variant} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="dh">
          {leading}
          <div className="grow">
            <h2 id={titleId}>{title}</h2>
            {sub && <div className="small muted">{sub}</div>}
            {status && <div className="status">{status}</div>}
          </div>
          <button type="button" className="x" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
        <div className="df">{footer}</div>
      </Panel>
    </div>
  );
}
