/**
 * Dashboard analytics.
 *
 * The API has no business-scoped analytics endpoints (the aggregate ones under
 * /v1/admin/* are admin-only), so every widget here is computed client-side from
 * the list endpoints. Widgets with no backing endpoint return deterministic sample
 * data flagged `isSample` so the UI can label it.
 *
 *   Message analytics   GET /v1/agent/{agent_id}/agent_activity   (status, is_human_handover, created_at)
 *   Total contacts      GET /v1/page/{page_id}/conversations      (pagination.total per page)
 *   Usage               GET /v1/subscription                      (usage.conversations_used vs plan cap; owner-only)
 *   Contact vs order    conversations total + GET /v1/pages/orders?page_id= (pagination.total)
 *   Message vs order    agent_activity + GET /v1/pages/orders     (created_at)
 *   Comment analytics   no endpoint yet -> sample
 *
 * Ranges are { start, end } local Dates covering whole days, start at 00:00 and
 * end at 23:59:59.999, bucketed one bar per day.
 */
import { apiService } from './api';

export const RANGE_PRESETS = [7, 14, 30];
// Daily bars stop being readable past a month.
export const MAX_RANGE_DAYS = 31;
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

export const formatRange = (range) => {
  if (range.preset) return `Last ${range.preset} days`;
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

const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// One bucket per local calendar day, oldest first.
const buildDays = (range) => Array.from({ length: rangeDays(range) }, (_, index) => {
  const date = new Date(range.start);
  date.setDate(date.getDate() + index);
  return {
    key: dayKey(date),
    label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };
});

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
  const buckets = buildDays(range).map(day => ({ ...day, replied: 0, unreplied: 0, tickets: 0 }));
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
    const bucket = byKey.get(dayKey(parseTimestamp(activity.created_at)));
    if (!bucket) return;
    if (activity.is_human_handover) bucket.tickets += 1;
    else if (activity.status === 'failed') bucket.unreplied += 1;
    else bucket.replied += 1;
  });

  return {
    series: buckets,
    total: buckets.reduce((sum, day) => sum + day.replied + day.unreplied + day.tickets, 0),
    agentCount: agentList.length,
    failedAgents: failures.length,
    truncated: loaded.some(result => result.truncated),
  };
}

export async function loadOrdersByDay(range) {
  const { items, truncated } = await collectInRange(
    cursor => apiService.getCustomerOrders({ cursor, page_size: PAGE_SIZE }),
    'orders',
    range,
  );
  const counts = new Map();
  items.forEach(order => {
    const key = dayKey(parseTimestamp(order.created_at));
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
  return buildDays(range).map(day => {
    const [year, month, date] = day.key.split('-').map(Number);
    return { ...day, comments: COMMENT_SHAPE[(year + month * 31 + date) % COMMENT_SHAPE.length] };
  });
}

export const mergeMessagesAndOrders = (messageSeries, ordersByDay) => messageSeries.map(day => ({
  key: day.key,
  label: day.label,
  messages: day.replied + day.unreplied + day.tickets,
  orders: ordersByDay.get(day.key) || 0,
}));
