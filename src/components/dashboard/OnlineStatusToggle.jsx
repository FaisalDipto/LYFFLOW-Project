import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { formatDuration } from '../../utils/ownerDashboard';

const sinceText = (iso, now) => {
  const started = Date.parse(iso || '');
  if (!Number.isFinite(started)) return '';
  const time = new Date(started).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `since ${time} (${formatDuration(Math.max(60, Math.floor((now - started) / 1000)))})`;
};

/**
 * Header switch for the member's own online status (every member, owner included). Online
 * time is what the owner sees per day; a member put offline by the backend is told so here.
 * Phones use the switch in the account panel (the avatar's dot shows the status); the
 * notice still shows, as a banner under the top bar.
 * @param {{ presence: ReturnType<import('../../hooks/useOnlineStatus').useOnlineStatus> }} props
 */
export default function OnlineStatusToggle({ presence }) {
  const { status, isOnline, onlineSince, busy, wasTimedOut, error, setOnline, dismissTimeout } = presence;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isOnline) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [isOnline]);

  if (status === 'unavailable') return null;
  const loading = status === 'loading';
  const title = loading ? 'Checking your status'
    : isOnline ? `Online ${sinceText(onlineSince, now)}. Click to go offline.`
      : 'Offline. Click to go online: your online time counts from now.';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOnline(!isOnline)}
        disabled={loading || busy}
        aria-pressed={isOnline}
        aria-label={isOnline ? 'You are online. Go offline' : 'You are offline. Go online'}
        title={title}
        className={`online-status-toggle hidden h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-bold transition disabled:cursor-wait sm:flex ${isOnline
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}
      >
        {busy || loading
          ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          : <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]' : 'border-[1.5px] border-solid border-slate-400'}`} aria-hidden="true" />}
        <span className="hidden sm:inline">{loading ? 'Status' : isOnline ? 'Online' : 'Offline'}</span>
      </button>

      {(wasTimedOut || error) && !isOnline && (
        <div role="alert" className="online-status-notice fixed left-3 right-3 top-[68px] z-[1200] rounded-xl border border-solid border-slate-200 bg-white p-3 text-left shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[280px]">
          <div className="flex items-start gap-2">
            <p className="m-0 flex-1 text-[12.5px] leading-relaxed text-slate-600">
              {error || (
                <>
                  <span className="block font-semibold text-slate-900">You're offline now</span>
                  Lyfflow didn't hear from this dashboard for a while (the tab was closed or the computer slept), so your online time stopped at your last activity.
                </>
              )}
            </p>
            <button type="button" onClick={dismissTimeout} aria-label="Dismiss" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={14} />
            </button>
          </div>
          {!error && (
            <button type="button" onClick={() => setOnline(true)} disabled={busy} className="mt-2.5 h-8 w-full rounded-lg bg-emerald-600 text-[12.5px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
              Go online
            </button>
          )}
        </div>
      )}
    </div>
  );
}
