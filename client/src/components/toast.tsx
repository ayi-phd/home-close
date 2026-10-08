import { useSyncExternalStore } from 'react';

let message: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Shows a short confirmation. Route actions call this after a successful change. */
export function showToast(text: string, ms = 2200) {
  message = text;
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => {
    message = null;
    emit();
  }, ms);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function Toaster() {
  const text = useSyncExternalStore(subscribe, () => message);
  return (
    <div role="status" aria-live="polite">
      {text && <div className="toast">{text}</div>}
    </div>
  );
}
