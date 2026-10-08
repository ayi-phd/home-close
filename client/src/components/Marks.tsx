import { Icon } from './Icon';

export function ClearedMark({ on }: { on: boolean }) {
  return (
    <span className={`cleared ${on ? 'on' : ''}`} role="img" aria-label={on ? 'Cleared' : 'Not cleared'}>
      {on && <Icon name="check" />}
    </span>
  );
}

export function SignoffMark({ by }: { by: string | null }) {
  return (
    <span className={`signoff ${by ? 'on' : ''}`} role="img" aria-label={by ? `Signed off by ${by}` : 'Not signed off'}>
      {by ?? ''}
    </span>
  );
}
