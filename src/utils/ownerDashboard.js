// Formatting and periods for the owner dashboard (GET /v1/dashboard/*). Days are in the
// business timezone; money arrives as two-decimal strings; percentages are already 0-100.

export const MAX_PERIOD_DAYS = 30;
const DAY_MS = 86400000;

/** Today as YYYY-MM-DD in the business timezone (null means UTC). */
export function todayInZone(timeZone) {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// Date-only arithmetic in UTC, so a local day never shifts across a timezone.
const dayToUtc = (day) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
const utcToDay = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (day, days) => utcToDay(dayToUtc(day) + days * DAY_MS);
export const periodDays = (start, end) => Math.round((dayToUtc(end) - dayToUtc(start)) / DAY_MS) + 1;

export const PERIOD_PRESETS = [
  { id: 'today', label: 'Today', days: 1 },
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
];

/** { preset, start_date, end_date } for a preset, ending today in the business timezone. */
export function presetPeriod(presetId, timeZone) {
  const preset = PERIOD_PRESETS.find(item => item.id === presetId) || PERIOD_PRESETS[1];
  const end = todayInZone(timeZone);
  return { preset: preset.id, start_date: addDays(end, -(preset.days - 1)), end_date: end };
}

const dayFormat = (day, options) => new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', ...options }).format(dayToUtc(day));

/** A local day ("2026-10-15") as "15 Oct" without shifting it through the browser's zone. */
export const formatDay = (day, options = { day: 'numeric', month: 'short' }) => (day ? dayFormat(day, options) : '');

/** "8–14 Oct" (or "Oct 8 – 14", by locale), "28 Sep – 4 Oct", or "15 Oct" for one day. */
export function formatDayRange(start, end) {
  if (!start || !end) return '';
  if (start === end) return formatDay(start);
  // formatRange shares the month the locale's way: "Oct 10 – 16", "10–16 Oct".
  return new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', day: 'numeric', month: 'short' }).formatRange(dayToUtc(start), dayToUtc(end));
}

export const periodLabel = (period) => {
  const preset = PERIOD_PRESETS.find(item => item.id === period?.preset);
  return preset ? preset.label : formatDayRange(period?.start_date, period?.end_date);
};

/** A UTC timestamp's clock time in the business timezone ("16:12"). */
export function formatClock(iso, timeZone) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: timeZone || 'UTC', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return '';
  }
}

/** A UTC timestamp as "21 Oct, 14:41" in the business timezone. */
export function formatDateTime(iso, timeZone) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: timeZone || 'UTC', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return '';
  }
}

export const DASH = '–';

export const formatCount = (value) => (value === null || value === undefined ? DASH : Number(value).toLocaleString());

export function formatMoney(value, currency, { compact = false } = {}) {
  if (value === null || value === undefined || value === '') return DASH;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return DASH;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'BDT',
      ...(compact
        ? { notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 }
        : { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: amount % 1 ? 2 : 0 }),
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency || ''}`.trim();
  }
}

export const formatPct = (value) => (value === null || value === undefined ? DASH : `${Number(value).toFixed(1)}%`);

/** Whole seconds as "14 s", "31 min", "6 h 40 min", "2 d 3 h". */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return DASH;
  const total = Math.max(0, Math.round(Number(seconds)));
  if (total < 60) return `${total} s`;
  const minutes = Math.round(total / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days} d ${hours % 24} h` : `${days} d`;
}

export const formatMinutes = (minutes) => (minutes === null || minutes === undefined ? DASH : formatDuration(Number(minutes) * 60));
export const formatHours = (hours) => (hours === null || hours === undefined ? DASH : formatDuration(Number(hours) * 3600));

// Which way is good, for colouring a delta. Anything not listed is volume only.
const HIGHER_IS_BETTER = new Set([
  'customer_messages', 'active', 'new_customers', 'returning_customers', 'ai_reply_pct', 'ai_handled', 'ai_handled_pct',
  'orders', 'revenue', 'average_order_value', 'ai_orders', 'ai_orders_pct', 'conversion_pct', 'leads', 'replied_within_5_min_pct',
]);
const LOWER_IS_BETTER = new Set(['handed_over', 'handed_over_pct', 'median_first_reply_seconds']);

/**
 * The delta of a compared value: { text, tone } where tone is good | bad | neutral, or
 * null when there is nothing to compare ("previous" missing).
 * @param {{ value: any, previous?: any, change_pct?: number|null, change_pp?: number|null }} compared
 * @param {string} field the response field name, for its direction
 */
export function describeChange(compared, field) {
  if (!compared || compared.previous === null || compared.previous === undefined) return null;
  const isPoints = 'change_pp' in compared;
  const change = isPoints ? compared.change_pp : compared.change_pct;
  if (change === null || change === undefined) {
    // Zero before: something new, never "+∞%".
    return Number(compared.previous) === 0 && Number(compared.value) > 0 ? { text: 'New', tone: 'neutral', direction: 0 } : null;
  }
  const rounded = Math.round(Number(change) * 10) / 10;
  const direction = Math.sign(rounded);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
  const text = `${sign}${Math.abs(rounded).toFixed(1)}${isPoints ? ' pts' : '%'}`;
  let tone = 'neutral';
  if (direction !== 0 && HIGHER_IS_BETTER.has(field)) tone = direction > 0 ? 'good' : 'bad';
  if (direction !== 0 && LOWER_IS_BETTER.has(field)) tone = direction < 0 ? 'good' : 'bad';
  return { text, tone, direction };
}

export const HANDOVER_CATEGORIES = {
  missing_knowledge: { label: 'Missing information', action: 'Add it to the knowledge base.' },
  product_identification: { label: 'Product not recognised', action: 'Improve product images and variant names.' },
  order_status_or_delivery: { label: 'Order status or delivery', action: 'Check the order data and the courier.' },
  order_change_or_cancel: { label: 'Order change or cancel', action: 'Make the change.' },
  complaint_refund_return: { label: 'Complaint, refund or return', action: 'Follow up personally.' },
  bulk_custom_or_pricing: { label: 'Bulk, custom or price request', action: 'Decide the offer.' },
  customer_asked_human: { label: 'Asked for a person', action: 'Reply personally.' },
  other: { label: 'Other', action: 'Read the chat.' },
  system_failure: { label: 'System failure', action: 'Nothing to fix in your content. Contact support if it happens often.' },
  uncategorized: { label: 'Uncategorized', action: '' },
};

export const handoverCategoryLabel = (category) => (category ? HANDOVER_CATEGORIES[category]?.label || category.replace(/_/g, ' ') : null);

/** A failed request as a short message: rate limits, roles and range errors read plainly. */
export function dashboardErrorMessage(error) {
  if (error?.status === 429) return 'Too many requests. Wait a minute, then try again.';
  if (error?.status === 403) return 'Only owners and admins can see the dashboard.';
  if (error?.status === 422) return error.message || 'That period is not valid.';
  return error?.message || 'Could not load this section.';
}
