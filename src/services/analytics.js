/**
 * Dashboard analytics.
 *
 * The API has no business-scoped analytics endpoints (the aggregate ones under
 * /v1/admin/* are admin-only), so every widget here is computed client-side from
 * the list endpoints. Widgets with no backing endpoint return deterministic sample
 * data flagged `isSample` so the UI can label it.
 *
 *   Message analytics   GET /v1/agent/{agent_id}/agent_activity   (status, created_at)
 *   Total contacts      GET /v1/page/{page_id}/conversations      (pagination.total per page)
 *   Usage               GET /v1/subscription                      (usage.conversations_used vs plan cap; owner-only)
 *   Contact vs order    conversations total + GET /v1/pages/orders?page_id= (pagination.total)
 *   Message vs order    agent_activity + GET /v1/pages/orders     (created_at)
 *   Comment analytics   no endpoint yet -> sample
 *
 * Ranges are { start, end } local Dates covering whole days, start at 00:00 and
 * end at 23:59:59.999. Bars are sized to the range (see barHours) so a chart
 * always holds 24-31 of them: one day is 24 hourly bars, a month is daily bars.
 */
import { apiService } from './api';

export const RANGE_PRESETS = [1, 7, 14, 30];
// Daily bars stop being readable past a month.
export const MAX_RANGE_DAYS = 31;
// Bar sizes divide a day evenly, so no bar straddles midnight.
const BAR_HOURS = [1, 2, 3, 4, 6, 8, 12, 24];
const MAX_BARS = 31;
const PAGE_SIZE = 100;
// Bounds how far each cursor walk goes so a busy workspace can't trip the rate limiter.
const MAX_CURSOR_PAGES = 10;
// Per-page counts cost two requests each; larger workspaces show their first N pages.
const MAX_PAGES_COMPARED = 10;
const DAY_MS = 86400000;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const presetRange = (days) => {
  const end = endOfDay(new Date());
  const start = startOfDay(end);
  start.setDate(start.getDate() - (days - 1));
  return { start, end, preset: days };
};

export const customRange = (start, end) => ({ start: startOfDay(start), end: endOfDay(end), preset: null });

export const rangeDays = ({ start, end }) => Math.round((startOfDay(end) - startOfDay(start)) / DAY_MS) + 1;

export const presetLabel = (days) => (days === 1 ? 'Today' : `Last ${days} days`);

export const formatRange = (range) => {
  if (range.preset) return presetLabel(range.preset);
  const options = { month: 'short', day: 'numeric' };
  const sameYear = range.start.getFullYear() === range.end.getFullYear();
  const from = range.start.toLocaleDateString(undefined, sameYear ? options : { ...options, year: 'numeric' });
  const to = range.end.toLocaleDateString(undefined, { ...options, year: 'numeric' });
  return rangeDays(range) === 1 ? to : `${from} – ${to}`;
};

// FastAPI serialises naive datetimes without an offset; those are UTC, but
// `new Date()` would read them as local time and shift them across days.
const parseTimestamp = (value) => {
  if (!value) return null;
  const text = String(value);
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const date = new Date(hasZone || !text.includes('T') ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pad = (value) => String(value).padStart(2, '0');

const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// The smallest bar that keeps the range within MAX_BARS: 1 day -> 1h, 2 days -> 2h,
// 7 days -> 6h, 14 days -> 12h, a month -> 1 day.
export const barHours = (range) => {
  const hours = rangeDays(range) * 24;
  return BAR_HOURS.find(size => hours / size <= MAX_BARS) || 24;
};

// Describes one bar for subtitles: "per hour", "per 6 hours", "per day".
export const barUnit = (range) => {
  const size = barHours(range);
  if (size === 24) return 'per day';
  return size === 1 ? 'per hour' : `per ${size} hours`;
};

// The bar a timestamp falls in; matches the keys buildBuckets hands out.
const bucketKey = (date, size) => {
  if (!date) return null;
  const d = new Date(date);
  return size === 24 ? dayKey(d) : `${dayKey(d)}T${pad(Math.floor(d.getHours() / size) * size)}`;
};

// Fixed names: newer ICU builds abbreviate September as "Sept" in en-GB.
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// One bucket per bar, oldest first. `label` is the axis text, `tooltipLabel` names
// the whole span ("4 Sep, 14:00–16:00").
const buildBuckets = (range) => {
  const size = barHours(range);
  const days = rangeDays(range);
  const buckets = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(range.start);
    date.setDate(date.getDate() + index);
    // Day-first ("4 Sep") for the Orders card's timeline, whatever the locale.
    const dayLabel = `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
    if (size === 24) {
      const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      buckets.push({ key: dayKey(date), label, shortLabel: dayLabel, tooltipLabel: label });
      continue;
    }
    for (let hour = 0; hour < 24; hour += size) {
      const from = `${pad(hour)}:00`;
      const label = days === 1 ? from : `${dayLabel} ${from}`;
      const span = size === 1 ? from : `${from}–${pad((hour + size) % 24)}:00`;
      buckets.push({ key: `${dayKey(date)}T${pad(hour)}`, label, shortLabel: days === 1 ? from : dayLabel, tooltipLabel: `${dayLabel}, ${span}` });
    }
  }
  return buckets;
};

const totalFrom = (response, listKey) => {
  const total = response?.pagination?.total;
  if (Number.isFinite(total)) return total;
  const list = Array.isArray(response) ? response : response?.[listKey];
  return Array.isArray(list) ? list.length : 0;
};

// Walks a newest-first cursor list back to `range.start`. `truncated` means the page
// cap stopped the walk first, so part of the range may be undercounted.
//
// Only the conversations list documents its order (newest first), so this checks
// each batch: a newest-first list stops once it passes `range.start`; any other
// order is walked to the end, since in-range items can be on any page.
const collectInRange = async (fetchPage, listKey, range) => {
  const items = [];
  let cursor = null;
  let truncated = false;
  for (let pageIndex = 0; pageIndex < MAX_CURSOR_PAGES; pageIndex += 1) {
    const response = await fetchPage(cursor);
    const batch = (Array.isArray(response?.[listKey]) ? response[listKey] : []).filter(item => item?.created_at);
    items.push(...batch);
    const pagination = response?.pagination;
    if (!pagination?.has_more || !pagination.next_cursor) break;
    const first = parseTimestamp(batch[0]?.created_at);
    const last = parseTimestamp(batch[batch.length - 1]?.created_at);
    // Equal ends (a page of same-second items) say nothing about order; keep walking.
    const newestFirst = first && last && first > last;
    if (newestFirst && last < range.start) break;
    if (pageIndex === MAX_CURSOR_PAGES - 1) truncated = true;
    cursor = pagination.next_cursor;
  }
  const inRange = items.filter(item => {
    const created = parseTimestamp(item.created_at);
    return created && created >= range.start && created <= range.end;
  });
  return { items: inRange, truncated };
};

export async function loadMessageActivity(agents, range) {
  const size = barHours(range);
  const buckets = buildBuckets(range).map(bucket => ({ ...bucket, replied: 0, unreplied: 0 }));
  const byKey = new Map(buckets.map(bucket => [bucket.key, bucket]));
  const agentList = agents || [];

  const perAgent = await Promise.allSettled(agentList.map(agent => collectInRange(
    cursor => apiService.getAgentActivity(agent.agent_id, cursor, PAGE_SIZE),
    'agent_activities',
    range,
  )));
  const loaded = perAgent.filter(result => result.status === 'fulfilled').map(result => result.value);
  const failures = perAgent.filter(result => result.status === 'rejected');
  // Every agent failing is an error to show, not an empty chart.
  if (agentList.length > 0 && loaded.length === 0) throw failures[0].reason;

  loaded.flatMap(result => result.items).forEach(activity => {
    const bucket = byKey.get(bucketKey(parseTimestamp(activity.created_at), size));
    if (!bucket) return;
    if (activity.status === 'failed') bucket.unreplied += 1;
    else bucket.replied += 1;
  });

  return {
    series: buckets,
    total: buckets.reduce((sum, bucket) => sum + bucket.replied + bucket.unreplied, 0),
    agentCount: agentList.length,
    failedAgents: failures.length,
    truncated: loaded.some(result => result.truncated),
  };
}

// Order counts keyed by bar (see bucketKey), for the range's bar size.
export async function loadOrderCounts(range) {
  const { items, truncated } = await collectInRange(
    cursor => apiService.getCustomerOrders({ cursor, page_size: PAGE_SIZE }),
    'orders',
    range,
  );
  const size = barHours(range);
  const counts = new Map();
  items.forEach(order => {
    const key = bucketKey(parseTimestamp(order.created_at), size);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return { counts, truncated };
}

// Contacts are conversations: one per customer per page. All-time; the
// conversations list has no creation date to filter on.
export async function loadPageCounts(pages) {
  const list = (pages || []).slice(0, MAX_PAGES_COMPARED);
  return Promise.all(list.map(async page => {
    const [conversations, orders] = await Promise.all([
      apiService.getPageDetails(page.page_id, null, 1).catch(() => null),
      apiService.getCustomerOrders({ page_id: page.page_id, page_size: 1 }).catch(() => null),
    ]);
    return {
      pageId: page.page_id,
      name: page.name || 'Untitled page',
      // Every connected page is a Facebook page today; Instagram arrives with its own source.
      source: page.platform || 'facebook',
      contacts: totalFrom(conversations, 'conversations'),
      orders: totalFrom(orders, 'orders'),
    };
  }));
}

// Plans mark "no cap" as -1 (or a very large number), as the Subscription tab does.
export async function loadUsage() {
  const subscription = await apiService.getSubscription();
  const limit = Number(subscription?.plan?.max_conversations_per_month);
  return {
    used: Number(subscription?.usage?.conversations_used) || 0,
    limit: Number.isFinite(limit) && limit > 0 && limit < 999999 ? limit : null,
    unlimited: limit === -1 || limit >= 999999,
  };
}

// No comments endpoint exists yet; a stable shape so the widget can be built against it.
const COMMENT_SHAPE = [42, 58, 51, 73, 66, 88, 79, 61, 70, 94, 83, 77, 90, 102];

export function sampleCommentSeries(range) {
  // Sub-day bars get a share of the day's sample, so the numbers stay plausible.
  const share = barHours(range) / 24;
  return buildBuckets(range).map(bucket => {
    const [year, month, date, hour = 0] = bucket.key.split(/[-T]/).map(Number);
    const daily = COMMENT_SHAPE[(year + month * 31 + date + hour) % COMMENT_SHAPE.length];
    return { ...bucket, comments: Math.max(1, Math.round(daily * share)) };
  });
}

// One point per bar, zero-filled: [{ date: '4 Sep', orders: 12 }, ...].
export const ordersSeries = (range, orderCounts) => buildBuckets(range).map(bucket => ({
  key: bucket.key,
  date: bucket.shortLabel,
  tooltipLabel: bucket.tooltipLabel,
  orders: orderCounts.get(bucket.key) || 0,
}));

export const mergeMessagesAndOrders = (messageSeries, orderCounts) => messageSeries.map(bucket => ({
  key: bucket.key,
  label: bucket.label,
  tooltipLabel: bucket.tooltipLabel,
  messages: bucket.replied + bucket.unreplied,
  orders: orderCounts.get(bucket.key) || 0,
}));
