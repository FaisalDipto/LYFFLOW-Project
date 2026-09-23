import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Compact month-grid range picker used by the order export panel.
 *
 * Dates are passed in and out as 'YYYY-MM-DD' strings, which is what the API
 * expects. All parsing is deliberately local-time: `new Date('2026-09-23')` is
 * parsed as UTC and would shift the highlighted day for anyone behind UTC.
 */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const toIso = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const fromIso = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date, count) => new Date(date.getFullYear(), date.getMonth() + count, 1);

const DateRangeCalendar = ({ startDate = '', endDate = '', maxDate = '', onChange }) => {
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(fromIso(startDate) || fromIso(endDate) || new Date())
  );

  const max = fromIso(maxDate);
  const start = fromIso(startDate);
  const end = fromIso(endDate);

  const days = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const cells = [];
    // Pad so the 1st lands under its weekday column.
    for (let i = 0; i < first.getDay(); i += 1) cells.push(null);
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
    }
    return cells;
  }, [viewMonth]);

  const handleDayClick = (date) => {
    const iso = toIso(date);
    // First click starts a new range; the second closes it, flipping if the
    // user picked the earlier day second.
    if (!start || (start && end)) {
      onChange({ start_date: iso, end_date: '' });
      return;
    }
    if (date < start) {
      onChange({ start_date: iso, end_date: toIso(start) });
      return;
    }
    onChange({ start_date: toIso(start), end_date: iso });
  };

  const isSameDay = (a, b) => Boolean(a && b) && a.getTime() === b.getTime();
  const isInRange = (date) => Boolean(start && end) && date > start && date < end;
  const isDisabled = (date) => Boolean(max) && date > max;

  const monthLabel = viewMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const canGoForward = !max || startOfMonth(addMonths(viewMonth, 1)) <= startOfMonth(max);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(prev => addMonths(prev, -1))}
          aria-label="Previous month"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs font-black text-slate-800">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setViewMonth(prev => addMonths(prev, 1))}
          disabled={!canGoForward}
          aria-label="Next month"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {WEEKDAYS.map((label, index) => (
          <span key={index} className="flex h-6 items-center justify-center text-[9px] font-black uppercase text-slate-400">
            {label}
          </span>
        ))}

        {days.map((date, index) => {
          if (!date) return <span key={`pad-${index}`} />;

          const selectedStart = isSameDay(date, start);
          const selectedEnd = isSameDay(date, end);
          const selected = selectedStart || selectedEnd;
          const inRange = isInRange(date);
          const disabled = isDisabled(date);

          return (
            <button
              key={toIso(date)}
              type="button"
              disabled={disabled}
              onClick={() => handleDayClick(date)}
              aria-pressed={selected}
              className={`flex h-7 items-center justify-center text-[11px] font-bold transition-colors ${
                selected
                  ? 'bg-emerald-600 text-white'
                  : inRange
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-100'
              } ${selectedStart && end ? 'rounded-l-lg' : ''} ${selectedEnd ? 'rounded-r-lg' : ''} ${
                selected && !end ? 'rounded-lg' : ''
              } ${!selected && !inRange ? 'rounded-lg' : ''} disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DateRangeCalendar;
