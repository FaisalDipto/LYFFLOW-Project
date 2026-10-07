import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

// A small notice pinned to the top right, under the dashboard's top bar. It sits
// outside the page flow, so it never pushes or squeezes the content, and it clears
// itself after `duration` ms.
//
// Render it inside .dashboard-layout so the dark theme rules apply.
export default function Toast({ tone = 'error', message, duration = 5000, onDismiss }) {
  useEffect(() => {
    const timerId = setTimeout(onDismiss, duration);
    return () => clearTimeout(timerId);
  }, [duration, message, onDismiss]);

  const isError = tone === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-20 z-[10050] flex justify-end sm:left-auto sm:right-6">
      <div
        role={isError ? 'alert' : 'status'}
        className={`dashboard-toast is-${tone} pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg motion-safe:animate-[slideInRight_0.35s_cubic-bezier(0.16,1,0.3,1)] ${isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
      >
        <Icon size={18} className="mt-px shrink-0" aria-hidden="true" />
        <p className="m-0 min-w-0 flex-1 font-medium leading-5">{message}</p>
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-60 transition hover:opacity-100">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
