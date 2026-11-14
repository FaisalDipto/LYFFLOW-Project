// Controls shared by the statistics sections: period tabs, custom range, page filter,
// and the comparison arrow for one figure.
import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronDown } from 'lucide-react';
import { MAX_PERIOD_DAYS, formatDay, formatDayRange, periodDays } from '../../utils/ownerDashboard';
import { PERIODS } from '../../utils/statsPeriods';
import DateRangeCalendar from '../DateRangeCalendar';

/** previous is 0 / "0.00": this didn't sell in the comparison period. */
const isNew = (figure) => figure?.change_pct == null && figure?.previous != null && Number(figure.previous) === 0;

/**
 * The comparison for one figure. A number change_pct shows the arrow and percentage;
 * previous 0 shows "New" (products only); previous null shows nothing.
 */
export const Change = ({ figure, allowNew = false, className = '' }) => {
  if (typeof figure?.change_pct === 'number') {
    const pct = figure.change_pct;
    const Arrow = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : null;
    const tone = pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-rose-600' : 'text-slate-500';
    return (
      <span className={`inline-flex items-center gap-0.5 whitespace-nowrap text-[12px] font-semibold tabular-nums ${tone} ${className}`}>
        {Arrow && <Arrow size={13} aria-hidden="true" />}
        {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
        <span className="sr-only">{pct > 0 ? ' up' : pct < 0 ? ' down' : ' no change'}</span>
      </span>
    );
  }
  if (allowNew && isNew(figure)) {
    return (
      <span className={`whitespace-nowrap rounded-full bg-sky-50 px-1.5 py-px text-[11px] font-semibold text-sky-700 ${className}`} title="Did not sell in the comparison period">
        New
      </span>
    );
  }
  return null;
};

export const PageSelect = ({ pages, value, onChange }) => (
  <label className="relative inline-flex">
    <span className="sr-only">Page</span>
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="h-9 max-w-[180px] cursor-pointer appearance-none truncate rounded-lg border border-solid border-slate-200 bg-white py-0 pl-3 pr-8 text-[13px] font-medium text-slate-700 outline-none transition hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
    >
      <option value="">All pages</option>
      {pages.map(page => <option key={page.page_id} value={page.page_id}>{page.name || page.page_name || page.page_id}</option>)}
    </select>
    <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
  </label>
);

// Custom range: a calendar of past days and today (in the business timezone), at most
// 30 days counting both ends. One click and Apply is a single day. `minDate` is the
// earliest day there is data for (`minDateNote` says why), when there is one.
export const CustomRange = ({ active, range, today, onApply, minDate = '', minDateNote = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState({ start_date: '', end_date: '' });
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => { if (!containerRef.current?.contains(event.target)) setIsOpen(false); };
    const handleKeyDown = (event) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggle = () => {
    if (!isOpen) setDraft(active ? { start_date: range.start_date, end_date: range.end_date } : { start_date: '', end_date: '' });
    setIsOpen(current => !current);
  };
  const draftEnd = draft.end_date || draft.start_date;
  const draftDays = draft.start_date ? periodDays(draft.start_date, draftEnd) : 0;
  const tooLong = draftDays > MAX_PERIOD_DAYS;
  const inFuture = Boolean(draftEnd) && draftEnd > today;
  const tooEarly = Boolean(minDate) && Boolean(draft.start_date) && draft.start_date < minDate;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-solid px-3 text-[13px] font-medium transition ${active
          ? 'product-sales-custom-active border-emerald-500/70 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}
      >
        <CalendarDays size={15} className="shrink-0" aria-hidden="true" />
        {active ? formatDayRange(range.start_date, range.end_date) : 'Custom'}
      </button>
      {isOpen && (
        <div role="dialog" aria-label="Choose days" className="absolute right-0 top-[calc(100%+6px)] z-[1100] w-[272px] rounded-xl border border-solid border-slate-200 bg-white p-2 text-left shadow-xl">
          <DateRangeCalendar startDate={draft.start_date} endDate={draft.end_date} minDate={minDate} maxDate={today} onChange={setDraft} />
          <p className={`mb-2 mt-2 text-[11.5px] font-medium ${tooLong || inFuture || tooEarly ? 'text-rose-600' : 'text-slate-500'}`}>
            {tooEarly
              ? (minDateNote || `Pick ${formatDay(minDate)} or a later day.`)
              : tooLong
              ? `Pick ${MAX_PERIOD_DAYS} days or fewer (this is ${draftDays}).`
              : inFuture
                ? 'Pick today or an earlier day.'
                : draft.start_date
                  ? `${formatDayRange(draft.start_date, draftEnd)} · ${draftDays} ${draftDays === 1 ? 'day' : 'days'}`
                  : `Pick one day, or a first and last day (up to ${MAX_PERIOD_DAYS} days).`}
          </p>
          <button
            type="button"
            onClick={() => { onApply({ start_date: draft.start_date, end_date: draftEnd }); setIsOpen(false); }}
            disabled={!draft.start_date || tooLong || inFuture || tooEarly}
            className="h-9 w-full rounded-lg bg-emerald-600 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {draft.start_date && draftDays === 1 ? 'Show this day' : 'Apply range'}
          </button>
        </div>
      )}
    </div>
  );
};

export const PeriodTabs = ({ value, onChange }) => (
  <div role="radiogroup" aria-label="Period" className="inline-flex h-9 items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
    {PERIODS.map(period => (
      <button
        key={period.id}
        type="button"
        role="radio"
        aria-checked={value === period.id}
        onClick={() => onChange(period.id)}
        className={`h-8 rounded-md px-3 text-[13px] font-medium transition ${value === period.id
          ? 'product-sales-period-active bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-900'}`}
      >
        {period.label}
      </button>
    ))}
  </div>
);
