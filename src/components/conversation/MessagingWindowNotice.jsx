import { useEffect, useState } from 'react';
import { Ban, Clock3, Hourglass } from 'lucide-react';
import { formatWindowDuration, messagingWindowState, windowSecondsLeft } from '../../utils/messagingWindow';

const formatExpiry = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

// Re-renders once a minute so the countdown stays current.
function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timerId = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timerId);
  }, []);
  return now;
}

/**
 * Where this conversation stands in Meta's reply windows, above the composer.
 * Inside 24h it is a quiet countdown line; after that a banner explains what changed.
 */
export default function MessagingWindowNotice({ status }) {
  const now = useMinuteClock();
  const [fetchedAt] = useState(() => Date.now());
  const state = messagingWindowState(status);
  if (!state) return null;
  const left = formatWindowDuration(windowSecondsLeft(status, now, fetchedAt));

  if (state === 'standard') {
    return (
      <p className="messaging-window-line m-0 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
        <Clock3 size={12} aria-hidden="true" />
        24-hour reply window: {left} left
      </p>
    );
  }

  if (state === 'human') {
    const until = formatExpiry(status.human_agent_window_expires_at);
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5" role="status">
        <Hourglass size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="m-0 text-[12px] font-medium leading-5 text-amber-900">
          <strong className="font-black">AI replies are off.</strong>{' '}
          It's been over 24 hours since the customer's last message, so only your team can reply, for {left}{until ? ` (until ${until})` : ''}. Replies are sent with Meta's Human Agent tag.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5" role="status">
      <Ban size={16} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />
      <p className="m-0 text-[12px] font-medium leading-5 text-rose-900">
        <strong className="font-black">Messaging window closed.</strong>{' '}
        Meta doesn't allow replies more than 7 days after the customer's last message. You can reply again once they send a new one.
      </p>
    </div>
  );
}
