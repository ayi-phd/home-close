import type { ReactNode } from 'react';
import type { ItemStatus } from '../api/types';

export const STATUS_LABEL: Record<ItemStatus, string> = {
  awaiting: 'Awaiting statement',
  entered: 'Statement entered',
  scheduled: 'Payment scheduled',
  paid: 'Paid',
  offcycle: 'Off-cycle',
};

export type PillTone = ItemStatus | 'overdue' | 'warn';

export function Pill({ tone, children, className = '' }: { tone: PillTone; children: ReactNode; className?: string }) {
  return <span className={`pill ${tone} ${className}`.trim()}>{children}</span>;
}

export function StatusPill({ status }: { status: ItemStatus }) {
  return <Pill tone={status}>{STATUS_LABEL[status]}</Pill>;
}
