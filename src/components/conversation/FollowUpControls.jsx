import { useEffect, useState } from 'react';
import { BellOff, BellRing, Loader2 } from 'lucide-react';
import { formatFollowUpIn, formatFollowUpTime } from '../../utils/followUps';

// Re-renders every 30 s so "in 20 min" stays true while the chat is open.
const useNow = (active) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
};

const Switch = ({ checked, disabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 md:h-5 md:w-9 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
  >
    <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform md:h-4 md:w-4 ${checked ? 'translate-x-5 md:translate-x-4' : ''}`} />
  </button>
);

/**
 * Above the composer: the next reminder with Skip, or that follow-ups are off for this
 * chat. Nothing when follow-ups are on and none is waiting. `next_follow_up_at` is a
 * hint: the server checks again when it's due and may move or drop it.
 * @param {{ contact: object, busy: 'skip'|'toggle'|null, notice?: string,
 *   onSkip: () => void, onToggle: (enabled: boolean) => void }} props
 */
export function FollowUpBar({ contact, busy, notice, onSkip, onToggle }) {
  const next = contact?.next_follow_up_at || null;
  const off = contact?.is_follow_up_enabled === false;
  const now = useNow(Boolean(next));
  if (!next && !off && !notice) return null;
  return (
    <div className="follow-up-bar mx-auto mb-2 flex max-w-4xl flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-solid border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-600" aria-live="polite">
      {next ? (
        <>
          <BellRing size={13} className="shrink-0 text-indigo-500" aria-hidden="true" />
          <span>
            Next follow-up <span className="font-semibold text-slate-800">{formatFollowUpTime(next, new Date(now))}</span>
            <span className="text-slate-400"> · {formatFollowUpIn(next, now)}</span>
          </span>
          <button type="button" onClick={onSkip} disabled={Boolean(busy)} className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 hover:underline disabled:opacity-50" title="Drop this reminder; the next one, if any, takes its place">
            {busy === 'skip' && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}Skip
          </button>
        </>
      ) : off ? (
        <>
          <BellOff size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
          <span>Follow-ups are off in this chat.</span>
          <button type="button" onClick={() => onToggle(true)} disabled={Boolean(busy)} className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 hover:underline disabled:opacity-50">
            {busy === 'toggle' && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}Turn on
          </button>
        </>
      ) : null}
      {notice && <span className="basis-full text-[11.5px] text-slate-500">{notice}</span>}
    </div>
  );
}

/**
 * Profile panel: the "Follow-ups in this chat" switch (is_follow_up_enabled) and when the
 * next reminder is due.
 */
export function FollowUpSection({ contact, busy, onToggle, onSkip }) {
  const enabled = contact?.is_follow_up_enabled !== false;
  const next = contact?.next_follow_up_at || null;
  const now = useNow(Boolean(next));
  return (
    <section className="conversation-follow-up" aria-labelledby="conversation-follow-up-heading">
      <h4 id="conversation-follow-up-heading" className="mb-3 border-b border-slate-100 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        Follow-ups
      </h4>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-800">Follow-ups in this chat</span>
        <span className="flex items-center gap-1.5">
          {busy === 'toggle' && <Loader2 size={13} className="animate-spin text-slate-400" aria-hidden="true" />}
          <Switch checked={enabled} disabled={Boolean(busy)} onChange={onToggle} label="Follow-ups in this chat" />
        </span>
      </div>
      <p className="mb-0 mt-1.5 text-[11px] leading-relaxed text-slate-500">
        {!enabled ? 'The agent sends no reminders to this customer.'
          : next ? <>Next one {formatFollowUpTime(next, new Date(now))} ({formatFollowUpIn(next, now)}). <button type="button" onClick={onSkip} disabled={Boolean(busy)} className="font-semibold text-emerald-700 hover:underline disabled:opacity-50">Skip it</button></>
            : 'None waiting. When the agent\'s follow-ups are on, it plans one after its next reply.'}
      </p>
    </section>
  );
}
