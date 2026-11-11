// Periods shared by the statistics sections (Product sales, Ads): the fixed ones, and a
// custom range of up to 30 days. Dates are days in the business timezone.
import { formatDay, formatDayRange, periodDays } from './ownerDashboard';

export const PERIODS = [
  { id: 'today', label: 'Today', phrase: 'today', compare: 'yesterday up to this time' },
  { id: 'last_7_days', label: '7 days', phrase: 'last 7 days', compare: 'the 7 days before' },
  { id: 'last_30_days', label: '30 days', phrase: 'last 30 days', compare: 'the 30 days before' },
];

// A custom range (start_date..end_date, both included) as the PERIODS entries read.
// Ending today, the comparison's last day is cut at the current time of day.
export const customPeriod = (start, end, today) => {
  const days = periodDays(start, end);
  const single = start === end;
  const label = formatDayRange(start, end);
  return {
    id: 'custom',
    label,
    phrase: single ? formatDay(start) : label,
    compare: single
      ? `the day before${end === today ? ' up to this time' : ''}`
      : `the ${days} days before${end === today ? ', up to this time on the last day' : ''}`,
  };
};

/**
 * A statistics endpoint's error as a sentence. `what` names the figures ("product sales").
 * 422 detail is a message for a bad range; a list (bad date format) has no usable text.
 */
export const statsErrorMessage = (error, what = 'these figures') => {
  if (error?.status === 403) return `Choose a business first: ${what} are shown for the active business.`;
  if (error?.status === 404) return 'That page is no longer part of this business.';
  if (error?.status === 422) {
    const text = typeof error?.message === 'string' ? error.message.trim() : '';
    const isFieldList = /^[[{]/.test(text) || /^(query|body|path)\./.test(text);
    return text && !isFieldList ? text : 'That filter is not valid. Choose another period or page.';
  }
  if (error?.status === 429) return 'Too many requests. Wait a minute, then try again.';
  if (error?.status === 500) return 'The figures could not be worked out right now. Try again in a moment.';
  return error?.message || `Could not load ${what}.`;
};
