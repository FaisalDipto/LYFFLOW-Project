import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Bot, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3,
  Hand, Info, MessageCircle, PackageOpen, RefreshCw, Sparkles, Target, TrendingUp, Users,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { apiService } from '../../services/api';
import DateRangeCalendar from '../DateRangeCalendar';
import { CHART_THEME, heatColor } from './chartTheme';
import { COMMENT_ACTIONS, commentCategoryLabel } from '../../utils/comments';
import {
  DASH,
  dashboardErrorMessage,
  describeChange,
  formatClock,
  formatCount,
  formatDateTime,
  formatDay,
  formatDayRange,
  formatDuration,
  formatHours,
  formatMinutes,
  formatMoney,
  formatPct,
  HANDOVER_CATEGORIES,
  handoverCategoryLabel,
  MAX_PERIOD_DAYS,
  PERIOD_PRESETS,
  periodDays,
  periodLabel,
  presetPeriod,
  todayInZone,
} from '../../utils/ownerDashboard';

const AttentionListModal = lazy(() => import('./AttentionListModal'));

const ATTENTION_POLL_MS = 60000;
const PERIOD_CACHE_MS = 60000;
const PERIOD_DEBOUNCE_MS = 300;
const PERIOD_VIEWS = {
  overview: apiService.getDashboardOverview,
  ai: apiService.getDashboardAi,
  growth: apiService.getDashboardGrowth,
  // Counts back `days` from now, so a period is sent as the days from its start to today.
  comments: ({ start_date: start, today }, options) => apiService.getCommentsSummary(
    { days: Math.min(365, Math.max(1, periodDays(start, today))) },
    options,
  ),
};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Period views by business and range, for about a minute: switching back and forth
// between ranges doesn't spend the 30-a-minute limit.
const periodCache = new Map();

const Section = ({ title, subtitle, icon: Icon, action, children, className = '' }) => (
  <section className={`min-w-0 ${className}`}>
    <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon size={17} className="shrink-0 text-slate-500" aria-hidden="true" />}
        <div className="min-w-0">
          <h2 className="m-0 text-[16px] font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="m-0 text-[12.5px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
    {children}
  </section>
);

const Card = ({ title, hint, children, className = '' }) => (
  <div className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
    {title && (
      <h3 className="mb-3 mt-0 flex items-center gap-1.5 text-[14px] font-semibold text-slate-900">
        {title}
        {hint && <InfoHint text={hint} />}
      </h3>
    )}
    {children}
  </div>
);

const InfoHint = ({ text }) => (
  <span className="inline-flex cursor-help text-slate-400" title={text} aria-label={text}>
    <Info size={13} />
  </span>
);

const Skeleton = ({ className = 'h-24' }) => <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;

const SectionError = ({ error, onRetry }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800" role="alert">
    <span className="flex items-center gap-2"><AlertTriangle size={15} aria-hidden="true" />{error}</span>
    <button type="button" onClick={onRetry} className="h-8 rounded-lg border border-solid border-rose-200 bg-white px-3 text-[12px] font-semibold text-rose-800 hover:bg-rose-100">
      Try again
    </button>
  </div>
);

const DELTA_TONES = {
  good: 'text-emerald-700',
  bad: 'text-rose-700',
  neutral: 'text-slate-500',
};

const Delta = ({ compared, field }) => {
  const change = describeChange(compared, field);
  if (!change) return null;
  const Arrow = change.direction > 0 ? ArrowUpRight : change.direction < 0 ? ArrowDownRight : null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] font-semibold ${DELTA_TONES[change.tone]}`}>
      {Arrow && <Arrow size={13} aria-hidden="true" />}
      {change.text}
    </span>
  );
};

/** A headline figure with its comparison. */
const Stat = ({ label, hint, value, compared, field, size = 'lg' }) => (
  <div className="min-w-0">
    <p className="m-0 flex items-center gap-1 text-[12px] font-medium text-slate-500">
      <span className="truncate">{label}</span>
      {hint && <InfoHint text={hint} />}
    </p>
    <p className={`m-0 mt-1 font-semibold tabular-nums text-slate-900 ${size === 'lg' ? 'text-[22px] leading-7' : 'text-[16px] leading-6'}`}>{value}</p>
    {compared && <Delta compared={compared} field={field} />}
  </div>
);

const Meter = ({ label, value, color, track }) => (
  <div>
    <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold tabular-nums text-slate-900">{formatPct(value)}</span>
    </div>
    <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: track }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%`, background: color }} />
    </div>
  </div>
);

const ChartTooltip = ({ active, payload, label, format }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-lg">
      <p className="m-0 font-semibold text-slate-900">{label}</p>
      <p className="m-0 text-slate-600">{format(payload[0].value)}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Period picker: presets ending today in the business timezone, or a custom range of
// up to 30 days. No days after today.

const PeriodPicker = ({ period, timeZone, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [draft, setDraft] = useState({ start_date: '', end_date: '' });
  const containerRef = useRef(null);
  const today = todayInZone(timeZone);

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
    if (!isOpen) {
      setIsCustomOpen(!period.preset);
      setDraft(period.preset ? { start_date: '', end_date: '' } : { start_date: period.start_date, end_date: period.end_date });
    }
    setIsOpen(current => !current);
  };
  const choose = (next) => {
    onChange(next);
    setIsOpen(false);
  };

  const draftEnd = draft.end_date || draft.start_date;
  const draftDays = draft.start_date ? periodDays(draft.start_date, draftEnd) : 0;
  const draftTooLong = draftDays > MAX_PERIOD_DAYS;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-solid border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
      >
        <CalendarDays size={15} className="shrink-0" />
        {periodLabel(period)}
        <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div role="dialog" aria-label="Choose period" className="absolute right-0 top-[calc(100%+6px)] z-[1100] w-[272px] rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl">
          {PERIOD_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => choose(presetPeriod(preset.id, timeZone))}
              className={`flex h-9 w-full items-center justify-between rounded-lg px-3 text-[13px] font-medium transition-colors hover:bg-slate-50 ${period.preset === preset.id ? 'text-emerald-700' : 'text-slate-700'}`}
            >
              {preset.label}
              {period.preset === preset.id && <Check size={14} />}
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => setIsCustomOpen(current => !current)}
            aria-expanded={isCustomOpen}
            className={`flex h-9 w-full items-center justify-between rounded-lg px-3 text-[13px] font-medium transition-colors hover:bg-slate-50 ${period.preset ? 'text-slate-700' : 'text-emerald-700'}`}
          >
            Custom range
            <ChevronDown size={14} className={`transition-transform ${isCustomOpen ? 'rotate-180' : ''}`} />
          </button>
          {isCustomOpen && (
            <div className="px-1.5 pb-1.5 pt-1">
              <DateRangeCalendar startDate={draft.start_date} endDate={draft.end_date} maxDate={today} onChange={setDraft} />
              <p className={`mb-2 mt-2 text-[11px] font-semibold ${draftTooLong ? 'text-rose-600' : 'text-slate-500'}`}>
                {draftTooLong
                  ? `Pick ${MAX_PERIOD_DAYS} days or fewer.`
                  : draft.start_date ? formatDayRange(draft.start_date, draftEnd) : 'Pick a start and end day.'}
              </p>
              <button
                type="button"
                onClick={() => choose({ preset: null, start_date: draft.start_date, end_date: draftEnd })}
                disabled={!draft.start_date || draftTooLong}
                className="h-9 w-full rounded-lg bg-emerald-600 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply range
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Attention: what needs a person right now.

const AttentionCard = ({ icon: Icon, title, count, facts, children, onSeeAll, seeAllLabel }) => (
  <div className={`flex min-w-0 flex-col rounded-2xl border bg-white p-4 shadow-sm ${count > 0 ? 'border-amber-200' : 'border-slate-200'}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${count > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
          {Icon && <Icon size={16} aria-hidden="true" />}
        </span>
        <h3 className="m-0 truncate text-[14px] font-semibold text-slate-900">{title}</h3>
      </div>
      <span className="text-[24px] font-semibold leading-7 tabular-nums text-slate-900">{count}</span>
    </div>
    {facts && <p className="mb-0 mt-2 text-[12px] text-slate-500">{facts}</p>}
    {children}
    {onSeeAll && (
      <button type="button" onClick={onSeeAll} className="mt-auto inline-flex items-center gap-1 self-start pt-2 text-[12.5px] font-semibold text-emerald-700 hover:text-emerald-800">
        {seeAllLabel}<ChevronRight size={14} />
      </button>
    )}
  </div>
);

const PreviewRow = ({ onClick, primary, secondary, trailing }) => (
  <li>
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-slate-900">{primary}</span>
        {secondary && <span className="block truncate text-[11.5px] text-slate-500">{secondary}</span>}
      </span>
      <span className="shrink-0 text-[12px] font-semibold tabular-nums text-slate-600">{trailing}</span>
    </button>
  </li>
);

const AttentionSection = ({ state, timeZone, currency, onRetry, onOpenChat, onOpenOrder, onOpenLeads, onOpenList }) => {
  const data = state.data;
  if (!data && state.error) return <SectionError error={state.error} onRetry={onRetry} />;
  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Skeleton className="h-44" /><Skeleton className="h-44" /><Skeleton className="h-44" />
      </div>
    );
  }
  const waiting = data.waiting_for_reply;
  const handovers = data.unanswered_handovers;
  const orders = data.new_orders_unprocessed;
  const leads = data.leads_not_contacted;
  const comments = data.pending_comment_reviews;
  const allClear = [waiting, handovers, orders, leads, comments].every(card => !card?.count);

  if (allClear) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-[13.5px] text-emerald-800">
        <CheckCircle2 size={20} aria-hidden="true" />
        <span><strong className="font-semibold">All clear.</strong> No customer is waiting, no handover is open and every order has been picked up.</span>
      </div>
    );
  }

  const seeAll = (card, kind) => (card.preview_truncated ? { onSeeAll: () => onOpenList(kind), seeAllLabel: `See all (${card.count})` } : {});

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <AttentionCard
          icon={Clock3}
          title="Waiting for a reply"
          count={waiting.count}
          facts={[
            waiting.count ? `Longest wait ${formatMinutes(waiting.oldest_minutes)}` : 'Nobody is waiting',
            waiting.ai_decided_no_reply ? `${waiting.ai_decided_no_reply} left by the AI as needing no reply` : null,
          ].filter(Boolean).join(' · ')}
          {...seeAll(waiting, 'waiting')}
        >
          {waiting.preview.length > 0 && (
            <ul className="-mx-2 mb-0 mt-2 list-none p-0">
              {waiting.preview.map(row => (
                <PreviewRow key={row.conversation_id} onClick={() => onOpenChat(row)} primary={row.customer_name || 'Customer'} trailing={formatMinutes(row.waiting_minutes)} />
              ))}
            </ul>
          )}
        </AttentionCard>
        <AttentionCard
          icon={Hand}
          title="Unanswered handovers"
          count={handovers.count}
          facts={handovers.count
            ? `${handovers.unassigned} unassigned · longest wait ${formatMinutes(handovers.oldest_minutes)}`
            : 'Every handover has an answer'}
          {...seeAll(handovers, 'handovers')}
        >
          {handovers.preview.length > 0 && (
            <ul className="-mx-2 mb-0 mt-2 list-none p-0">
              {handovers.preview.map(row => (
                <PreviewRow
                  key={row.conversation_id}
                  onClick={() => onOpenChat(row)}
                  primary={row.customer_name || 'Customer'}
                  secondary={`${handoverCategoryLabel(row.category) || 'Paused or no category'} · ${row.assigned_to_name || 'Unassigned'}`}
                  trailing={`waiting ${formatMinutes(row.waiting_minutes)}`}
                />
              ))}
            </ul>
          )}
        </AttentionCard>
        <AttentionCard
          icon={PackageOpen}
          title="Unprocessed orders"
          count={orders.count}
          facts={orders.count
            ? [`Oldest ${formatHours(orders.oldest_hours)}`, orders.missing_contact ? `${orders.missing_contact} missing a phone or address` : null].filter(Boolean).join(' · ')
            : 'Every order has been picked up'}
          {...seeAll(orders, 'orders')}
        >
          {orders.preview.length > 0 && (
            <ul className="-mx-2 mb-0 mt-2 list-none p-0">
              {orders.preview.map(row => (
                <PreviewRow
                  key={row.customer_order_id}
                  onClick={() => onOpenOrder(row)}
                  primary={`${row.order_id} · ${row.customer_name || 'Customer'}`}
                  secondary={[formatMoney(row.total, currency), row.missing_contact ? 'No phone or address' : null].filter(Boolean).join(' · ')}
                  trailing={formatHours(row.age_hours)}
                />
              ))}
            </ul>
          )}
        </AttentionCard>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" onClick={onOpenLeads} className="flex items-center gap-3 rounded-2xl border border-solid border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-slate-50">
          <Target size={17} className="shrink-0 text-slate-500" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-[13px] text-slate-700">
            <strong className="font-semibold text-slate-900">{leads.count} {leads.count === 1 ? 'lead' : 'leads'}</strong> not contacted after a day
            {leads.count > 0 && <span className="text-slate-500"> · oldest {formatHours(leads.oldest_hours)}</span>}
          </span>
          <ChevronRight size={15} className="shrink-0 text-slate-400" />
        </button>
        <button type="button" onClick={() => onOpenList('comments')} className="flex items-center gap-3 rounded-2xl border border-solid border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-slate-50">
          <MessageCircle size={17} className="shrink-0 text-slate-500" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-[13px] text-slate-700">
            <strong className="font-semibold text-slate-900">{comments.count} {comments.count === 1 ? 'comment' : 'comments'}</strong> flagged for your review
          </span>
          <ChevronRight size={15} className="shrink-0 text-slate-400" />
        </button>
      </div>
      {state.error && <p className="m-0 text-[12px] text-rose-700">Could not refresh: {state.error}</p>}
      <p className="m-0 text-[11.5px] text-slate-400">Updated {formatClock(data.as_of, timeZone)}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Overview: is the business healthy?

const DAILY_METRICS = [
  { id: 'customer_messages', label: 'Messages' },
  { id: 'active_conversations', label: 'Conversations' },
  { id: 'orders', label: 'Orders' },
  { id: 'revenue', label: 'Revenue' },
];

const OverviewSection = ({ data, palette, currency }) => {
  const [metric, setMetric] = useState('customer_messages');
  const { messages, conversations, sales, response_time: responseTime, daily } = data;
  const isMoney = metric === 'revenue';
  const format = (value) => (isMoney ? formatMoney(value, currency) : formatCount(value));
  const chartData = daily.map(day => ({ label: formatDay(day.date), value: Number(day[metric]) || 0 }));
  const metricLabel = DAILY_METRICS.find(item => item.id === metric)?.label;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><Stat label="Customer messages" hint="Messages customers sent to your pages, including button taps and story mentions." value={formatCount(messages.customer_messages.value)} compared={messages.customer_messages} field="customer_messages" /></Card>
        <Card><Stat label="Active conversations" hint="Conversations with at least one customer message in the period. One conversation is one customer on one page." value={formatCount(conversations.active.value)} compared={conversations.active} field="active" /></Card>
        <Card><Stat label="Orders" hint="Orders created in the period. Cancelled and deleted orders are left out." value={formatCount(sales.orders.value)} compared={sales.orders} field="orders" /></Card>
        <Card><Stat label="Revenue" hint="The total of those orders as currently recorded, including delivery. It changes to the cash-on-delivery amount when booked with a courier." value={formatMoney(sales.revenue.value, currency)} compared={sales.revenue} field="revenue" /></Card>
        <Card><Stat label="Conversion" hint="Active conversations that placed at least one order ÷ active conversations." value={formatPct(sales.conversion_pct.value)} compared={sales.conversion_pct} field="conversion_pct" /></Card>
        <Card><Stat label="Replies by AI" hint="How many messages the AI handles: AI replies ÷ all replies." value={formatPct(messages.ai_reply_pct.value)} compared={messages.ai_reply_pct} field="ai_reply_pct" /></Card>
        <Card><Stat label="Conversations handled by AI" hint="The AI replied, nobody else did, and there was no handover or failed AI turn ÷ active conversations." value={formatPct(conversations.ai_handled_pct.value)} compared={conversations.ai_handled_pct} field="ai_handled_pct" /></Card>
        <Card><Stat label="Typical first reply" hint="Median time from a customer's message to the next reply from anyone, including a Meta automation." value={formatDuration(responseTime.median_first_reply_seconds.value)} compared={responseTime.median_first_reply_seconds} field="median_first_reply_seconds" /></Card>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-[14px] font-semibold text-slate-900">{metricLabel} per day</h3>
            <div role="tablist" aria-label="Daily chart" className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {DAILY_METRICS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={metric === item.id}
                  onClick={() => setMetric(item.id)}
                  className={`h-7 rounded-md px-2.5 text-[12px] font-semibold transition-colors ${metric === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke={palette.grid} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: palette.axis, fontSize: 11 }} minTickGap={12} />
                <YAxis tickLine={false} axisLine={false} width={isMoney ? 64 : 40} tick={{ fill: palette.axis, fontSize: 11 }} allowDecimals={false}
                  tickFormatter={value => (isMoney ? formatMoney(value, currency, { compact: true }) : formatCount(value))} />
                <Tooltip cursor={{ fill: palette.cursor }} content={<ChartTooltip format={format} />} />
                <Bar dataKey="value" name={metricLabel} fill={palette.series[0]} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Response times">
          <dl className="m-0 grid grid-cols-1 gap-3 text-[13px]">
            <MetricLine label="Replied within 5 min" hint="Share of customer waits answered within 5 minutes, among waits that were answered or are already older than 5 minutes." value={formatPct(responseTime.replied_within_5_min_pct.value)} compared={responseTime.replied_within_5_min_pct} field="replied_within_5_min_pct" />
            <MetricLine label="Unanswered after 24 h" hint="Share of waits older than 24 hours that still have no reply." value={formatPct(responseTime.unanswered_after_24h_pct)} />
            <MetricLine label="Closed by AI without reply" hint={'Waits the AI chose not to answer, such as a "thanks". These don\'t count as unanswered.'} value={formatCount(responseTime.no_reply_needed)} />
            <MetricLine label="Handed to your team" hint="The AI handed the chat to a person, or an AI turn failed." value={`${formatCount(conversations.handed_over.value)} · ${formatPct(conversations.handed_over_pct.value)}`} compared={conversations.handed_over_pct} field="handed_over_pct" />
          </dl>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Card><Stat size="sm" label="New customers" hint="Active conversations that started in the period." value={formatCount(conversations.new_customers.value)} compared={conversations.new_customers} field="new_customers" /></Card>
        <Card><Stat size="sm" label="Returning customers" hint="Active conversations that started before the period." value={formatCount(conversations.returning_customers.value)} compared={conversations.returning_customers} field="returning_customers" /></Card>
        <Card><Stat size="sm" label="Average order" hint="Revenue ÷ orders." value={formatMoney(sales.average_order_value.value, currency)} compared={sales.average_order_value} field="average_order_value" /></Card>
        <Card><Stat size="sm" label="Orders taken by AI" hint="Orders the AI captured; your team created the rest." value={`${formatCount(sales.ai_orders.value)} · ${formatPct(sales.ai_orders_pct.value)}`} compared={sales.ai_orders_pct} field="ai_orders_pct" /></Card>
        <Card><Stat size="sm" label="Leads" hint="Conversations where the AI captured a lead, counted once per conversation." value={formatCount(sales.leads.value)} compared={sales.leads} field="leads" /></Card>
        <Card><Stat size="sm" label="Replies" hint="Messages sent to customers by anyone: the AI, your team or the Meta inbox. One AI answer can be several parts." value={formatCount(messages.replies.value)} compared={messages.replies} field="replies" /></Card>
      </div>
    </div>
  );
};

const MetricLine = ({ label, hint, value, compared, field }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="flex min-w-0 items-center gap-1 text-slate-600">
      <span>{label}</span>
      {hint && <InfoHint text={hint} />}
    </dt>
    <dd className="m-0 flex shrink-0 flex-col items-end">
      <span className="font-semibold tabular-nums text-slate-900">{value}</span>
      {compared && <Delta compared={compared} field={field} />}
    </dd>
  </div>
);

// ---------------------------------------------------------------------------
// AI: is it doing its job?

const AiSection = ({ data, palette, timeZone, onOpenChat }) => {
  const [missingOnly, setMissingOnly] = useState(false);
  const { share, handovers, failed_turns: failed, recent_handovers: recent, response_time: times, time_saved_hours: saved, team } = data;
  const maxCategory = Math.max(1, ...handovers.by_category.map(item => item.count));
  const recentRows = missingOnly ? recent.filter(row => row.category === 'missing_knowledge') : recent;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="How much the AI handles">
          <div className="space-y-3">
            <Meter label="Replies by AI" value={share.ai_reply_pct} color={palette.series[0]} track={palette.meterTrack} />
            <Meter label="Conversations handled by AI" value={share.ai_handled_conversations_pct} color={palette.series[0]} track={palette.meterTrack} />
            <Meter label="Conversations where the AI ran" value={share.ai_active_conversations_pct} color={palette.series[0]} track={palette.meterTrack} />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800">
            <Sparkles size={15} aria-hidden="true" />
            <span><strong className="font-semibold">≈ {saved.value === null ? DASH : `${Number(saved.value).toLocaleString()} h`}</strong> of replies saved</span>
            <InfoHint text={`An estimate: ${formatCount(saved.ai_handled_turns)} replies the AI handled × ${saved.seconds_per_reply} seconds each.`} />
          </div>
        </Card>

        <Card title="Why the AI handed over" hint="Turns where the AI decided to hand the chat to a person, by category. A failed turn with a holding message counts under failed turns instead.">
          <p className="m-0 mb-3 text-[12.5px] text-slate-500">
            {formatCount(handovers.count)} handovers · {formatPct(handovers.pct_of_ai_conversations)} of AI conversations
          </p>
          {handovers.by_category.length === 0 ? (
            <p className="m-0 text-[13px] text-slate-500">No handovers in this period.</p>
          ) : (
            <ul className="m-0 list-none space-y-2.5 p-0">
              {handovers.by_category.map(item => (
                <li key={item.category} title={HANDOVER_CATEGORIES[item.category]?.action || ''}>
                  <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="truncate text-slate-700">{handoverCategoryLabel(item.category)}</span>
                    <span className="shrink-0 tabular-nums text-slate-500"><strong className="font-semibold text-slate-900">{item.count}</strong> · {formatPct(item.pct)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${(item.count / maxCategory) * 100}%`, background: palette.series[1] }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Speed and failures">
          <dl className="m-0 grid grid-cols-1 gap-2.5 text-[13px]">
            <MetricLine label="AI first reply" hint="Median first-reply time when the AI answered first." value={formatDuration(times.ai_median_seconds)} />
            <MetricLine label="Your team's first reply" hint="Median first-reply time when your team answered first from the LyfFlow inbox." value={formatDuration(times.team_median_seconds)} />
            <MetricLine label="Replies from outside LyfFlow" hint="Median first-reply time when the first reply came from the Meta inbox or a Meta automation (instant reply, away message). They can't be told apart." value={formatDuration(times.outside_app_median_seconds)} />
            <MetricLine label="Handover to a person's reply" hint="Median time from a handover to the first reply that didn't come from the AI." value={formatDuration(times.handover_to_human_reply_median_seconds)} />
            <MetricLine label="Handovers not answered" hint="Handovers nobody answered before the AI's next turn or within 7 days. For a period ending today this drops as your team replies." value={formatCount(times.handovers_without_human_reply)} />
          </dl>
          <div className="mt-4 border-t border-slate-100 pt-3 text-[13px]">
            <p className="m-0 text-slate-600">
              <strong className="font-semibold text-slate-900">{formatCount(failed.count)}</strong> failed AI turns · {formatPct(failed.pct_of_turns)} of turns
            </p>
            <p className="m-0 mt-1 text-[12.5px] text-slate-500">{formatCount(failed.with_fallback)} sent a holding message and flagged the chat.</p>
            {failed.silent > 0 && (
              <p className="mb-0 mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[12.5px] text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span><strong className="font-semibold">{failed.silent}</strong> failed silently: nothing was sent and nobody was alerted. Those customers show under "Waiting for a reply" while they still have no answer.</span>
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-[14px] font-semibold text-slate-900">Recent handovers</h3>
            <button
              type="button"
              onClick={() => setMissingOnly(current => !current)}
              aria-pressed={missingOnly}
              className={`h-7 rounded-full border border-solid px-3 text-[12px] font-semibold transition-colors ${missingOnly ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              What the AI doesn't know
            </button>
          </div>
          {recentRows.length === 0 ? (
            <p className="m-0 text-[13px] text-slate-500">{missingOnly ? 'No handovers for missing information in this period.' : 'No handovers in this period.'}</p>
          ) : (
            <ul className="-mx-2 m-0 list-none p-0">
              {recentRows.map((row, index) => (
                <li key={`${row.conversation_id}-${row.at}-${index}`}>
                  <button type="button" onClick={() => onOpenChat(row)} className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${row.category === 'system_failure' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                          {handoverCategoryLabel(row.category)}
                        </span>
                        <span className="text-[12.5px] font-medium text-slate-800">{row.reason}</span>
                      </span>
                      {row.customer_message && <span className="mt-0.5 block truncate text-[12px] text-slate-500">“{row.customer_message}”</span>}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-slate-500">{formatDateTime(row.at, timeZone)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-2" title="Your team">
          {team.length === 0 ? (
            <p className="m-0 text-[13px] text-slate-500">No team members yet.</p>
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-1 pb-2 font-semibold">Member</th>
                    <th className="px-1 pb-2 text-right font-semibold">Replies</th>
                    <th className="px-1 pb-2 text-right font-semibold" title="Manual orders created">Orders</th>
                    <th className="px-1 pb-2 text-right font-semibold" title="Median time to answer a handover">Handover reply</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map(member => (
                    <tr key={member.user_id} className="border-t border-slate-100">
                      <td className="max-w-[140px] truncate px-1 py-2 font-medium text-slate-900">{member.name}</td>
                      <td className="px-1 py-2 text-right tabular-nums text-slate-700">
                        {formatCount(member.replies)}
                        {member.reply_share_pct !== null && <span className="text-slate-400"> · {formatPct(member.reply_share_pct)}</span>}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums text-slate-700">{formatCount(member.orders_created)}</td>
                      <td className="px-1 py-2 text-right tabular-nums text-slate-700">{formatDuration(member.handover_reply_median_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mb-0 mt-3 text-[12px] text-slate-500">
            {formatCount(data.unattributed_human_replies)} replies came from outside LyfFlow (Meta Business Suite, the Messenger app or Meta automations) and can't be linked to a member.
          </p>
        </Card>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Comments: what the moderation agent saw and did.

const COMMENT_TRENDS = [
  { id: 'total', label: 'All' },
  { id: 'queries', label: 'Questions' },
  { id: 'negative_reviews', label: 'Negative' },
  { id: 'spam_abuse', label: 'Spam & abuse' },
  { id: 'positive_neutral', label: 'Positive' },
];

const CommentsSection = ({ data, period, today, palette, onReview }) => {
  const [metric, setMetric] = useState('total');
  const total = Number(data.total_comments) || 0;
  // Shares from the counts, so they read the same whatever scale `percentage` uses.
  const share = (count) => (total ? (count / total) * 100 : null);
  const categories = [...(data.categories || [])].filter(item => item.count > 0).sort((a, b) => b.count - a.count);
  const actions = [...(data.actions || [])].filter(item => item.count > 0).sort((a, b) => b.count - a.count);
  const maxCategory = Math.max(1, ...categories.map(item => item.count));
  // The summary counts back from now; a range ending before today shows only its own days.
  const trends = (data.daily_trends || []).filter(day => day.date >= period.start_date && day.date <= period.end_date);
  const metricLabel = COMMENT_TRENDS.find(item => item.id === metric)?.label;
  const since = period.end_date !== today ? `since ${formatDay(period.start_date)}` : null;

  if (total === 0) {
    return <Card><p className="m-0 text-[13px] text-slate-500">No comments were checked in this period.</p></Card>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <Card>
        <Stat label={`Comments checked${since ? ` ${since}` : ''}`} hint="Comments on your posts the moderation agent evaluated." value={formatCount(total)} />
        <div className={`mt-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[13px] ${data.pending_review_count ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'}`}>
          <span><strong className="font-semibold">{formatCount(data.pending_review_count)}</strong> waiting for your review</span>
          {data.pending_review_count > 0 && (
            <button type="button" onClick={onReview} className="inline-flex items-center gap-0.5 font-semibold text-amber-900 hover:underline">
              Review<ChevronRight size={14} />
            </button>
          )}
        </div>
        <h3 className="mb-2 mt-4 text-[12px] font-semibold uppercase tracking-wide text-slate-500">What the agent did</h3>
        <dl className="m-0 grid grid-cols-1 gap-2 text-[13px]">
          {actions.map(item => (
            <MetricLine key={item.action} label={COMMENT_ACTIONS[item.action] || item.action} value={`${formatCount(item.count)} · ${formatPct(share(item.count))}`} />
          ))}
        </dl>
      </Card>

      <Card title="By category">
        <ul className="m-0 list-none space-y-2.5 p-0">
          {categories.map(item => (
            <li key={item.category}>
              <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                <span className="truncate text-slate-700">{commentCategoryLabel(item.category)}</span>
                <span className="shrink-0 tabular-nums text-slate-500"><strong className="font-semibold text-slate-900">{formatCount(item.count)}</strong> · {formatPct(share(item.count))}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${(item.count / maxCategory) * 100}%`, background: palette.series[2] }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-[14px] font-semibold text-slate-900">Per day</h3>
          <select
            value={metric}
            onChange={event => setMetric(event.target.value)}
            aria-label="Comments shown per day"
            className="h-8 rounded-lg border border-solid border-slate-200 bg-white py-0 pl-2 pr-7 text-[12px] font-semibold leading-8 text-slate-700"
          >
            {COMMENT_TRENDS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends.map(day => ({ label: formatDay(day.date), value: Number(day[metric]) || 0 }))} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke={palette.grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: palette.axis, fontSize: 10 }} minTickGap={12} />
              <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tick={{ fill: palette.axis, fontSize: 10 }} />
              <Tooltip cursor={{ fill: palette.cursor }} content={<ChartTooltip format={value => `${formatCount(value)} ${metricLabel === 'All' ? 'comments' : metricLabel.toLowerCase()}`} />} />
              <Bar dataKey="value" name={metricLabel} fill={palette.series[2]} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Growth: where to act to sell more.

const PLATFORM_LABELS = { fb: 'Facebook', ig: 'Instagram', wa: 'WhatsApp', tt: 'TikTok' };

const BusyHours = ({ busyHours, isDark }) => {
  const grid = busyHours?.customer_messages || [];
  const max = Math.max(0, ...grid.flat());
  const startsSunday = !busyHours?.weekday_0 || busyHours.weekday_0 === 'sunday';
  if (max === 0) return <p className="m-0 text-[13px] text-slate-500">No customer messages in this period.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] table-fixed border-separate text-[10.5px]" style={{ borderSpacing: 2 }} aria-label="Customer messages by weekday and hour">
        <thead>
          <tr>
            <th className="w-9" />
            {Array.from({ length: 24 }, (_, hour) => (
              <th key={hour} scope="col" className="p-0 text-center font-medium text-slate-400">{hour % 3 === 0 ? hour : ''}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((hours, row) => {
            const weekday = WEEKDAYS[startsSunday ? row : (row + 1) % 7];
            return (
              <tr key={weekday}>
                <th scope="row" className="pr-1 text-left font-medium text-slate-500">{weekday}</th>
                {hours.map((count, hour) => {
                  const { background } = heatColor(count, max, isDark);
                  return (
                    <td
                      key={hour}
                      className="h-5 rounded-[3px] p-0"
                      style={{ background }}
                      title={`${weekday} ${String(hour).padStart(2, '0')}:00: ${formatCount(count)} messages`}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
        <span>Fewer</span>
        {[0.1, 0.35, 0.6, 0.85, 1].map(step => (
          <span key={step} className="h-2.5 w-4 rounded-[3px]" style={{ background: heatColor(step, 1, isDark).background }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

const GrowthSection = ({ data, palette, currency, isDark }) => {
  const { pages, busy_hours: busyHours, handovers_by_hour: handoversByHour, top_products: products, new_vs_returning: newVsReturning } = data;
  const hourData = handoversByHour.map((count, hour) => ({ label: `${String(hour).padStart(2, '0')}:00`, value: count }));
  return (
    <div className="space-y-3">
      <Card title="Pages">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-1 pb-2 font-semibold">Page</th>
                <th className="px-1 pb-2 text-right font-semibold">Messages</th>
                <th className="px-1 pb-2 text-right font-semibold">Conversations</th>
                <th className="px-1 pb-2 text-right font-semibold">Orders</th>
                <th className="px-1 pb-2 text-right font-semibold">Revenue</th>
                <th className="px-1 pb-2 text-right font-semibold">Conversion</th>
                <th className="px-1 pb-2 text-right font-semibold">First reply</th>
              </tr>
            </thead>
            <tbody>
              {pages.map(page => (
                <tr key={page.page_id} className="border-t border-slate-100">
                  <td className="max-w-[200px] px-1 py-2">
                    <span className="block truncate font-medium text-slate-900">{page.page_name}</span>
                    <span className="text-[11px] text-slate-500">{PLATFORM_LABELS[page.platform] || page.platform}</span>
                  </td>
                  <td className="px-1 py-2 text-right tabular-nums text-slate-700">{formatCount(page.customer_messages)}</td>
                  <td className="px-1 py-2 text-right tabular-nums text-slate-700">{formatCount(page.active_conversations)}</td>
                  <td className="px-1 py-2 text-right tabular-nums text-slate-700">{formatCount(page.orders)}</td>
                  <td className="px-1 py-2 text-right tabular-nums text-slate-700">{formatMoney(page.revenue, currency)}</td>
                  <td className="px-1 py-2 text-right tabular-nums text-slate-700">{formatPct(page.conversion_pct)}</td>
                  <td className="px-1 py-2 text-right tabular-nums text-slate-700">{formatDuration(page.median_first_reply_seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="Busy hours" hint="Customer messages by weekday and hour, in your business timezone. Plan staffing and campaigns around the darkest cells.">
          <BusyHours busyHours={busyHours} isDark={isDark} />
        </Card>
        <Card className="xl:col-span-2" title="Handovers by hour" hint="Handovers the AI decided, per hour of the day. The peaks show when your team is needed most.">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="18%">
                <CartesianGrid vertical={false} stroke={palette.grid} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: palette.axis, fontSize: 10 }} interval={5} />
                <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tick={{ fill: palette.axis, fontSize: 10 }} />
                <Tooltip cursor={{ fill: palette.cursor }} content={<ChartTooltip format={value => `${formatCount(value)} handovers`} />} />
                <Bar dataKey="value" name="Handovers" fill={palette.series[1]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Top products" hint="Most units ordered, from orders that weren't cancelled. Revenue is unit price × quantity, before delivery.">
          {products.length === 0 ? (
            <p className="m-0 text-[13px] text-slate-500">No products ordered in this period.</p>
          ) : (
            <ol className="m-0 list-none space-y-2.5 p-0">
              {products.map(product => (
                <li key={product.code || product.name}>
                  <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="min-w-0 truncate font-medium text-slate-900">
                      {product.name}
                      {product.code && <span className="ml-1.5 font-normal uppercase text-slate-400">{product.code}</span>}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      {formatCount(product.quantity)} sold · {formatMoney(product.revenue, currency)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Number(product.revenue_share_pct) || 0)}%`, background: palette.series[0] }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-slate-500">{formatPct(product.revenue_share_pct)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="New vs returning customers">
          <div className="grid grid-cols-2 gap-3">
            {[['New', newVsReturning.new], ['Returning', newVsReturning.returning]].map(([label, group]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="m-0 text-[12px] font-medium text-slate-500">{label}</p>
                <p className="m-0 mt-1 text-[20px] font-semibold tabular-nums text-slate-900">{formatPct(group.conversion_pct)}</p>
                <p className="m-0 text-[12px] text-slate-500">{formatCount(group.ordered)} of {formatCount(group.conversations)} ordered</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const emptyView = { status: 'loading', data: null, error: '' };

/**
 * The owner dashboard (owners and admins): what needs attention now, then the
 * business, the AI and growth for a period of up to 30 days.
 * @param {{ isDark?: boolean, isActive?: boolean,
 *   onNavigate: (target: { tab?: string, pageId?: string, conversationId?: string, recordType?: string,
 *     recordId?: string, status?: string, commentAnalysisId?: string }) => void }} props
 */
export default function OwnerDashboard({ isDark = false, isActive = true, onNavigate }) {
  const { business } = useBusiness();
  const timeZone = business?.timezone || 'UTC';
  const businessCurrency = business?.currency || 'BDT';
  const businessId = business?.business_id || '';
  const palette = CHART_THEME[isDark ? 'dark' : 'light'];

  // A preset is kept as its id and resolved against today in the business timezone,
  // so it is right once the business (and its timezone) has loaded.
  const [choice, setChoice] = useState({ preset: '7d' });
  const period = useMemo(
    () => (choice.preset ? presetPeriod(choice.preset, timeZone) : choice),
    [choice, timeZone],
  );
  const [views, setViews] = useState({ overview: emptyView, ai: emptyView, growth: emptyView, comments: emptyView });
  const today = todayInZone(timeZone);
  const [reloadKey, setReloadKey] = useState(0);
  const [attention, setAttention] = useState({ data: null, error: '' });
  const [openList, setOpenList] = useState(null);
  const attentionRequestRef = useRef(0);

  const loadView = useCallback(async (view, target, signal, { force = false } = {}) => {
    const today = todayInZone(timeZone);
    const cacheKey = `${businessId}|${view}|${target.start_date}|${target.end_date}|${today}`;
    const cached = periodCache.get(cacheKey);
    if (!force && cached && Date.now() - cached.at < PERIOD_CACHE_MS) {
      setViews(current => ({ ...current, [view]: { status: 'ready', data: cached.data, error: '' } }));
      return;
    }
    setViews(current => ({ ...current, [view]: { ...current[view], status: 'loading', error: '' } }));
    try {
      const data = await PERIOD_VIEWS[view]({ start_date: target.start_date, end_date: target.end_date, today }, { signal });
      if (signal.aborted) return;
      periodCache.set(cacheKey, { data, at: Date.now() });
      setViews(current => ({ ...current, [view]: { status: 'ready', data, error: '' } }));
    } catch (error) {
      if (signal.aborted || error?.name === 'AbortError') return;
      setViews(current => ({ ...current, [view]: { status: 'error', data: current[view].data, error: dashboardErrorMessage(error) } }));
    }
  }, [businessId, timeZone]);

  // Period views: debounced, and the previous period's requests are cancelled.
  useEffect(() => {
    if (!isActive) return undefined;
    const controller = new AbortController();
    const force = reloadKey > 0;
    const timer = setTimeout(() => {
      Object.keys(PERIOD_VIEWS).forEach(view => loadView(view, period, controller.signal, { force }));
    }, PERIOD_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isActive, loadView, period, reloadKey]);

  const loadAttention = useCallback(async () => {
    const requestId = ++attentionRequestRef.current;
    try {
      const data = await apiService.getDashboardAttention();
      if (requestId !== attentionRequestRef.current) return;
      setAttention({ data, error: '' });
    } catch (error) {
      if (requestId !== attentionRequestRef.current) return;
      setAttention(current => ({ data: current.data, error: dashboardErrorMessage(error) }));
    }
  }, []);

  // Attention is live: on show, every minute while visible, and again on return.
  useEffect(() => {
    if (!isActive) return undefined;
    let timer = null;
    const start = () => {
      clearInterval(timer);
      loadAttention();
      timer = setInterval(loadAttention, ATTENTION_POLL_MS);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') clearInterval(timer);
      else start();
    };
    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isActive, loadAttention, reloadKey]);

  const retryView = (view) => {
    const controller = new AbortController();
    loadView(view, period, controller.signal, { force: true });
  };

  const openChat = useCallback((row) => {
    onNavigate?.({ tab: 'conversation', pageId: row.page_id, conversationId: row.conversation_id });
  }, [onNavigate]);
  const openOrder = useCallback((row) => {
    onNavigate?.({ tab: 'customer-orders', recordType: 'order', recordId: row.customer_order_id });
  }, [onNavigate]);
  const openLeads = useCallback(() => {
    onNavigate?.({ tab: 'customer-leads', recordType: 'lead', status: 'new' });
  }, [onNavigate]);
  const openListRow = useCallback((row) => {
    const kind = openList;
    setOpenList(null);
    if (kind === 'orders') openOrder(row);
    else if (kind === 'comments') onNavigate?.({ commentAnalysisId: row.id, pageId: row.page_id, canAction: true });
    else openChat(row);
  }, [onNavigate, openChat, openList, openOrder]);
  const closeList = useCallback(() => {
    setOpenList(null);
    // Whatever was done from the list shows up in the counts straight away.
    loadAttention();
  }, [loadAttention]);

  const range = views.overview.data?.range || views.ai.data?.range || views.growth.data?.range;
  const currency = range?.currency || businessCurrency;
  const isLoadingAny = Object.values(views).some(view => view.status === 'loading');
  const comparisonLabel = range?.previous ? `Compared with ${formatDayRange(range.previous.start_date, range.previous.end_date)}` : '';

  const renderView = (view, skeleton, render) => {
    const state = views[view];
    if (state.status === 'error' && !state.data) return <SectionError error={state.error} onRetry={() => retryView(view)} />;
    if (!state.data) return skeleton;
    return (
      <>
        {state.status === 'error' && <div className="mb-3"><SectionError error={state.error} onRetry={() => retryView(view)} /></div>}
        <div className={state.status === 'loading' ? 'opacity-60 transition-opacity' : 'transition-opacity'}>{render(state.data)}</div>
      </>
    );
  };

  // Hidden tabs stay mounted; charts measure 0x0 under display:none.
  if (!isActive) return null;

  return (
    <div className="owner-dashboard dashboard-compact-top dashboard-content-area w-full flex-1 bg-surface-bright text-left">
      <h1 className="sr-only">Dashboard</h1>

      <div className="space-y-8">
        <Section title="Needs you now" icon={AlertTriangle}>
          <AttentionSection
            state={attention}
            timeZone={timeZone}
            currency={businessCurrency}
            onRetry={loadAttention}
            onOpenChat={openChat}
            onOpenOrder={openOrder}
            onOpenLeads={openLeads}
            onOpenList={setOpenList}
          />
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
          <p className="m-0 text-[12.5px] text-slate-500">{comparisonLabel}</p>
          <div className="flex items-center gap-2">
            <PeriodPicker period={period} timeZone={timeZone} onChange={setChoice} />
            <button
              type="button"
              onClick={() => setReloadKey(key => key + 1)}
              disabled={isLoadingAny}
              aria-label="Refresh dashboard"
              title="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-solid border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw size={15} className={isLoadingAny ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <Section title="Business health" icon={TrendingUp}>
          {renderView('overview', (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)}</div>
              <Skeleton className="h-[300px]" />
            </div>
          ), data => <OverviewSection data={data} palette={palette} currency={data.range?.currency || currency} />)}
        </Section>

        <Section title="AI performance" icon={Bot}>
          {renderView('ai', <Skeleton className="h-[320px]" />, data => (
            <AiSection data={data} palette={palette} timeZone={data.range?.timezone || timeZone} onOpenChat={openChat} />
          ))}
        </Section>

        <Section title="Comments" icon={MessageCircle}>
          {renderView('comments', <Skeleton className="h-[300px]" />, data => (
            <CommentsSection data={data} period={period} today={today} palette={palette} onReview={() => setOpenList('comments')} />
          ))}
        </Section>

        <Section title="Growth" icon={Users}>
          {renderView('growth', <Skeleton className="h-[420px]" />, data => (
            <GrowthSection data={data} palette={palette} currency={data.range?.currency || currency} isDark={isDark} />
          ))}
        </Section>
      </div>

      {openList && (
        <Suspense fallback={null}>
          <AttentionListModal kind={openList} timeZone={timeZone} currency={businessCurrency} onOpen={openListRow} onClose={closeList} />
        </Suspense>
      )}
    </div>
  );
}
