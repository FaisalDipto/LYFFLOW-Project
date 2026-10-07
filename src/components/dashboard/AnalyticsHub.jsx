import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CalendarDays, Check, ChevronDown, MessageCircle, MessagesSquare, RefreshCw, ShoppingCart, Users } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import DateRangeCalendar from '../DateRangeCalendar';
import {
  customRange,
  formatRange,
  loadMessageActivity,
  loadOrderCounts,
  loadPageCounts,
  loadUsage,
  MAX_RANGE_DAYS,
  mergeMessagesAndOrders,
  ordersSeries,
  barUnit,
  presetLabel,
  presetRange,
  RANGE_PRESETS,
  rangeDays,
  sampleCommentSeries,
} from '../../services/analytics';

// Categorical slots 1-3 (green, orange, blue) validate as a set in both modes; the
// dark column is the same hues stepped for the black surface.
const CHART_THEME = {
  light: {
    series: ['#1baf7a', '#eb6834', '#2a78d6'],
    grid: '#e2e8f0',
    axis: '#64748b',
    cursor: 'rgba(15, 23, 42, 0.04)',
    meterTrack: '#c8eedd',
    warning: '#c98500',
    critical: '#e34948',
  },
  dark: {
    series: ['#199e70', '#d95926', '#3987e5'],
    grid: '#2a2a2a',
    axis: '#9b9b9b',
    cursor: 'rgba(255, 255, 255, 0.04)',
    meterTrack: '#0f3a2b',
    warning: '#c98500',
    critical: '#e66767',
  },
};

const SOURCE_LABELS = { facebook: 'Facebook', instagram: 'Instagram' };

const formatNumber = (value) => (Number(value) || 0).toLocaleString();

// Keeps the rejection reason so a failed request can say why, instead of looking empty.
const settle = (result) => (result.status === 'fulfilled'
  ? { value: result.value, error: null }
  : { value: null, error: result.reason || new Error('Request failed') });

const describeError = (error) => {
  const message = error?.message || 'Request failed';
  return error?.status ? `${message} (HTTP ${error.status})` : message;
};

const WidgetCard = ({ title, subtitle, icon: Icon, badge, className = '', children }) => (
  <section className={`flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Icon size={16} strokeWidth={2.2} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="m-0 truncate text-[15px] font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mb-0 mt-0.5 text-[12.5px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {badge}
    </header>
    {children}
  </section>
);

const SampleBadge = ({ reason }) => (
  <span title={reason} className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
    Sample data
  </span>
);

const ChartState = ({ height, children }) => (
  <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-500" style={{ height }}>
    {children}
  </div>
);

const ChartSkeleton = ({ height }) => (
  <div className="page-sync-shimmer w-full rounded-xl" style={{ height }} aria-hidden="true" />
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="m-0 mb-1 font-semibold text-slate-900">{payload[0].payload?.tooltipLabel || label}</p>
      {payload.map(entry => (
        <p key={entry.dataKey} className="m-0 flex items-center gap-2 text-slate-500">
          <span className="h-2 w-2 rounded-sm" style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums text-slate-900">{formatNumber(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

const LegendItem = ({ color, label }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
    {label}
  </span>
);

// Built from the series list rather than Recharts' payload, which v3 sorts alphabetically;
// the legend has to read in bar order. Text stays in ink, not series color.
const SeriesLegend = ({ series, palette }) => (
  <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 pb-2">
    {series.map(({ key, label }, index) => <LegendItem key={key} color={palette.series[index]} label={label} />)}
  </div>
);

const ColumnChart = ({ data, series, palette, height = 240, showLegend = series.length > 1, xKey = 'label' }) => (
  <div style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={1} barCategoryGap="8%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={palette.grid} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={{ stroke: palette.grid }} tick={{ fill: palette.axis, fontSize: 11, fontWeight: 600 }} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: palette.axis, fontSize: 11, fontWeight: 600 }} tickFormatter={formatNumber} width={48} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: palette.cursor }} />
        {showLegend && <Legend verticalAlign="top" align="right" content={<SeriesLegend series={series} palette={palette} />} />}
        {series.map(({ key, label }, index) => (
          <Bar key={key} dataKey={key} name={label} fill={palette.series[index]} radius={[4, 4, 0, 0]} maxBarSize={44} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const ContactsCard = ({ pageCounts, loading, palette }) => {
  const total = (pageCounts || []).reduce((sum, page) => sum + page.contacts, 0);
  const bySource = ['facebook', 'instagram'].map((source, index) => ({
    source,
    label: SOURCE_LABELS[source],
    color: palette.series[index],
    value: (pageCounts || []).filter(page => page.source === source).reduce((sum, page) => sum + page.contacts, 0),
  }));
  const visibleSegments = bySource.filter(segment => segment.value > 0);

  return (
    <WidgetCard title="Total contacts" subtitle="All time · customers who messaged your pages" icon={Users}>
      {loading ? (
        <ChartSkeleton height={96} />
      ) : (
        <>
          <p className="dashboard-display m-0 text-5xl leading-none text-slate-900">{formatNumber(total)}</p>
          <div className="mt-5 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100" role="img" aria-label={bySource.map(segment => `${segment.label} ${formatNumber(segment.value)}`).join(', ')}>
            {visibleSegments.map(segment => (
              <span key={segment.source} style={{ width: `${(segment.value / total) * 100}%`, background: segment.color }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {bySource.map(segment => (
              <span key={segment.source} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: segment.color }} />
                {segment.label}
                <span className="font-semibold tabular-nums text-slate-900">{formatNumber(segment.value)}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
};

const UsageCard = ({ usage, error, loading, isOwner, palette }) => {
  let body;
  if (!isOwner) {
    body = <p className="m-0 text-xs font-semibold text-slate-500">Usage and limits are visible to the business owner.</p>;
  } else if (loading) {
    body = <ChartSkeleton height={64} />;
  } else if (error?.status === 404) {
    body = <p className="m-0 text-xs font-semibold text-slate-500">No active plan, so there is no usage to show.</p>;
  } else if (error || !usage) {
    body = <p className="m-0 text-xs font-semibold text-red-600">Could not load usage: {describeError(error)}</p>;
  } else if (!usage.limit) {
    body = (
      <>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-slate-500">Conversations this month</span>
          <span className="text-sm font-semibold tabular-nums text-slate-900">{formatNumber(usage.used)}</span>
        </div>
        <p className="mb-0 mt-2 text-[11px] font-semibold text-slate-500">
          {usage.unlimited ? 'Your plan has no monthly conversation limit.' : 'Your plan does not report a monthly conversation limit.'}
        </p>
      </>
    );
  } else {
    const ratio = Math.min(usage.used / usage.limit, 1);
    const tone = ratio >= 0.95 ? 'critical' : ratio >= 0.8 ? 'warning' : null;
    const fill = tone ? palette[tone] : palette.series[0];
    body = (
      <>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-slate-500">Conversations this month</span>
          <span className="text-sm font-semibold tabular-nums text-slate-900">
            {formatNumber(usage.used)} <span className="font-normal text-slate-500">/ {formatNumber(usage.limit)}</span>
          </span>
        </div>
        <div
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full"
          style={{ background: palette.meterTrack }}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={usage.limit}
          aria-valuenow={usage.used}
          aria-label="Conversations used this month"
        >
          <span className="block h-full rounded-full" style={{ width: `${ratio * 100}%`, background: fill }} />
        </div>
        <p className="mb-0 mt-2 text-[11px] font-semibold text-slate-500">
          {tone === 'critical' ? 'Limit almost reached. ' : tone === 'warning' ? 'Approaching your limit. ' : ''}
          {formatNumber(Math.max(usage.limit - usage.used, 0))} remaining
        </p>
      </>
    );
  }

  return (
    <WidgetCard title="API usage" subtitle="Plan quota consumed by your agents" icon={Activity}>
      {body}
    </WidgetCard>
  );
};

// Amber stepped to each surface: #d97706 holds contrast on white, #f59e0b on the dark navy.
const ORDERS_STROKE = { light: '#d97706', dark: '#f59e0b' };

const OrdersCard = ({ data, loading, error, truncated, isDark, onViewOrders }) => {
  const stroke = ORDERS_STROKE[isDark ? 'dark' : 'light'];
  const total = (data || []).reduce((sum, day) => sum + day.orders, 0);
  // Dark mode takes the spec's gray/white text; light mode the matching slate ink.
  const titleClass = isDark ? 'text-gray-200' : 'text-slate-700';
  const valueClass = isDark ? 'text-white' : 'text-slate-950';
  const linkClass = isDark ? 'text-gray-500 hover:text-white' : 'text-slate-500 hover:text-slate-900';

  let body;
  if (loading) {
    body = (
      <>
        <div className="page-sync-shimmer mt-3 h-8 w-20 rounded-lg" aria-hidden="true" />
        <div className="mt-auto pt-4"><ChartSkeleton height={128} /></div>
      </>
    );
  } else if (error) {
    body = <p className="mb-0 mt-3 text-xs font-semibold text-red-600">Could not load orders: {describeError(error)}</p>;
  } else {
    body = (
      <>
        <p className={`dashboard-display mb-0 mt-3 text-4xl leading-none ${valueClass}`}>{formatNumber(total)}</p>
        <div className="mt-auto h-32 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              {/* Only the first bar is labelled; the tooltip carries the rest. */}
              <XAxis
                dataKey="date"
                ticks={data.length ? [data[0].date] : []}
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? '#6b7280' : '#64748b', fontSize: 11, fontWeight: 600, textAnchor: 'start' }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: isDark ? '#3f3f3f' : '#cbd5e1', strokeWidth: 1 }} />
              <Area
                dataKey="orders"
                name="Orders"
                type="step"
                stroke={stroke}
                strokeWidth={2}
                fill="url(#colorOrders)"
                activeDot={{ r: 4, fill: stroke, stroke: isDark ? '#141414' : '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {truncated && <TruncatedNote />}
      </>
    );
  }

  return (
    <section className="flex min-h-[260px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Inline radius: the dashboard stylesheet squares off rounded-full on spans. */}
          <span className="h-4 w-1 bg-cyan-400" style={{ borderRadius: 9999 }} aria-hidden="true" />
          <h2 className={`m-0 text-[15px] font-semibold ${titleClass}`}>Orders</h2>
        </div>
        <button type="button" onClick={onViewOrders} className={`text-xs transition-colors ${linkClass}`}>
          View orders
        </button>
      </header>
      {body}
    </section>
  );
};

// DateRangeCalendar speaks local 'YYYY-MM-DD' strings.
const toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromIso = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const RangePicker = ({ range, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [draft, setDraft] = useState({ start_date: '', end_date: '' });
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggle = () => {
    if (!isOpen) {
      // Reopening on a custom range shows it in the calendar, ready to adjust.
      setIsCustomOpen(!range.preset);
      setDraft(range.preset ? { start_date: '', end_date: '' } : { start_date: toIso(range.start), end_date: toIso(range.end) });
    }
    setIsOpen(current => !current);
  };

  const choose = (nextRange) => {
    onChange(nextRange);
    setIsOpen(false);
  };

  // A lone start date is a one-day range.
  const draftRange = draft.start_date ? customRange(fromIso(draft.start_date), fromIso(draft.end_date || draft.start_date)) : null;
  const draftTooLong = Boolean(draftRange) && rangeDays(draftRange) > MAX_RANGE_DAYS;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
      >
        <CalendarDays size={15} className="shrink-0" />
        {formatRange(range)}
        <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div role="dialog" aria-label="Choose date range" className="absolute right-0 top-[calc(100%+6px)] z-[1100] w-[272px] rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl">
          {RANGE_PRESETS.map(days => (
            <button
              key={days}
              type="button"
              onClick={() => choose(presetRange(days))}
              className={`flex h-9 w-full items-center justify-between rounded-lg px-3 text-[13px] font-medium transition-colors hover:bg-slate-50 ${range.preset === days ? 'text-emerald-700' : 'text-slate-700'}`}
            >
              {presetLabel(days)}
              {range.preset === days && <Check size={14} />}
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => setIsCustomOpen(current => !current)}
            aria-expanded={isCustomOpen}
            className={`flex h-9 w-full items-center justify-between rounded-lg px-3 text-[13px] font-medium transition-colors hover:bg-slate-50 ${range.preset ? 'text-slate-700' : 'text-emerald-700'}`}
          >
            Custom range
            <ChevronDown size={14} className={`transition-transform ${isCustomOpen ? 'rotate-180' : ''}`} />
          </button>

          {isCustomOpen && (
            <div className="px-1.5 pb-1.5 pt-1">
              <DateRangeCalendar
                startDate={draft.start_date}
                endDate={draft.end_date}
                maxDate={toIso(new Date())}
                onChange={setDraft}
              />
              <p className={`mb-2 mt-2 text-[11px] font-semibold ${draftTooLong ? 'text-red-600' : 'text-slate-500'}`}>
                {draftTooLong
                  ? `Pick ${MAX_RANGE_DAYS} days or fewer.`
                  : draftRange ? formatRange(draftRange) : 'Pick a start and end day.'}
              </p>
              <button
                type="button"
                onClick={() => choose(draftRange)}
                disabled={!draftRange || draftTooLong}
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

const TruncatedNote = () => (
  <p className="mb-0 mt-2 text-[11px] font-semibold text-slate-500">
    Showing the most recent activity only; the earliest days in this range may be undercounted.
  </p>
);

export default function AnalyticsHub({ pages, agents, isDark, isActive = true, onNavigate }) {
  const { isOwner } = useBusiness();
  const palette = CHART_THEME[isDark ? 'dark' : 'light'];
  const [range, setRange] = useState(() => presetRange(7));
  // Range-dependent series, refetched when the range changes.
  const [ranged, setRanged] = useState({ loading: true, messages: null, orders: null });
  // All-time totals, independent of the range.
  const [totals, setTotals] = useState({ loading: true, pageCounts: null, usage: null });
  const [reloadKey, setReloadKey] = useState(0);

  const pageKey = (pages || []).map(page => page.page_id).join('|');
  const agentKey = (agents || []).map(agent => agent.agent_id).join('|');

  // Both loaders are keyed on ids so a refreshed-but-identical page or agent list doesn't refetch.
  const loadRanged = useCallback(async (signal) => {
    setRanged(current => ({ ...current, loading: true }));
    const [messages, orders] = await Promise.allSettled([
      loadMessageActivity(agents, range),
      loadOrderCounts(range),
    ]);
    if (signal.cancelled) return;
    setRanged({ loading: false, messages: settle(messages), orders: settle(orders) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentKey, range]);

  const loadTotals = useCallback(async (signal) => {
    setTotals(current => ({ ...current, loading: true }));
    const [pageCounts, usage] = await Promise.allSettled([
      loadPageCounts(pages),
      isOwner ? loadUsage() : Promise.resolve(null),
    ]);
    if (signal.cancelled) return;
    setTotals({ loading: false, pageCounts: settle(pageCounts), usage: settle(usage) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, isOwner]);

  useEffect(() => {
    const signal = { cancelled: false };
    loadRanged(signal);
    return () => { signal.cancelled = true; };
  }, [loadRanged, reloadKey]);

  useEffect(() => {
    const signal = { cancelled: false };
    loadTotals(signal);
    return () => { signal.cancelled = true; };
  }, [loadTotals, reloadKey]);

  const isLoading = ranged.loading || totals.loading;
  const rangeLabel = formatRange(range);
  const perBar = barUnit(range);
  const commentSeries = useMemo(() => sampleCommentSeries(range), [range]);
  const messages = ranged.messages?.value || null;
  const orders = ranged.orders?.value || null;
  const messageVsOrder = useMemo(
    () => (messages && orders ? mergeMessagesAndOrders(messages.series, orders.counts) : null),
    [messages, orders],
  );
  const hasOrdersInRange = Boolean(orders) && [...orders.counts.values()].some(count => count > 0);
  const orderTimeline = useMemo(() => (orders ? ordersSeries(range, orders.counts) : null), [orders, range]);

  // `empty` is a message for data that loaded fine but has nothing to plot.
  const renderChart = ({ settled, loading = ranged.loading, empty = null, height = 240 }, render) => {
    if (loading) return <ChartSkeleton height={height} />;
    if (settled?.error) return <ChartState height={height}>Could not load this data: {describeError(settled.error)}</ChartState>;
    if (empty) return <ChartState height={height}>{empty}</ChartState>;
    return render(settled.value);
  };

  const rangePhrase = range.preset === 1 ? 'today' : range.preset ? `the last ${range.preset} days` : rangeLabel;
  let messagesEmpty = null;
  if (messages?.agentCount === 0) messagesEmpty = 'Create an agent to see message analytics.';
  else if (messages?.total === 0) messagesEmpty = `No agent activity in ${rangePhrase}.`;

  // The dashboard keeps hidden tabs mounted under display:none, where ResponsiveContainer
  // measures 0x0 and warns. Data and range survive here; the charts remount at full size.
  if (!isActive) return null;

  return (
    <div className="dashboard-content-area w-full flex-1 bg-surface-bright p-4 text-left md:p-6 xl:p-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="dashboard-display m-0 text-3xl text-slate-950 md:text-4xl">Dashboard</h1>
        <div className="flex items-center gap-2">
          {/* Presets are relative to today, so re-picking one after midnight moves the window. */}
          <RangePicker range={range} onChange={setRange} disabled={ranged.loading} />
          <button
            type="button"
            onClick={() => setReloadKey(key => key + 1)}
            disabled={isLoading}
            aria-label="Refresh analytics"
            title="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <WidgetCard className="xl:col-span-2" title="Message analytics" subtitle={`Agent replies and failed replies ${perBar} · ${rangeLabel}`} icon={MessagesSquare}>
          {renderChart({ settled: ranged.messages, empty: messagesEmpty }, data => (
            <ColumnChart
              data={data.series}
              palette={palette}
              series={[
                { key: 'replied', label: 'Replied' },
                { key: 'unreplied', label: 'Unreplied' },
              ]}
            />
          ))}
          {!ranged.loading && messages?.failedAgents > 0 && (
            <p className="mb-0 mt-2 text-[11px] font-semibold text-red-600">
              Activity for {messages.failedAgents} of {messages.agentCount} agents could not be loaded.
            </p>
          )}
          {!ranged.loading && messages?.truncated && <TruncatedNote />}
        </WidgetCard>

        <ContactsCard pageCounts={totals.pageCounts?.value} loading={totals.loading} palette={palette} />

        <WidgetCard
          className="xl:col-span-2"
          title="Comment analytics"
          subtitle={`Total comments ${perBar} · ${rangeLabel}`}
          icon={MessageCircle}
          badge={<SampleBadge reason="The API does not expose comment data yet." />}
        >
          <ColumnChart data={commentSeries} palette={palette} series={[{ key: 'comments', label: 'Comments' }]} />
        </WidgetCard>

        <UsageCard usage={totals.usage?.value} error={totals.usage?.error} loading={totals.loading} isOwner={isOwner} palette={palette} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <OrdersCard
          data={orderTimeline}
          loading={ranged.loading}
          error={ranged.orders?.error}
          truncated={orders?.truncated}
          isDark={isDark}
          onViewOrders={() => onNavigate?.('customer-orders')}
        />

        <WidgetCard title="Contact vs order" subtitle="All-time totals per page" icon={Users}>
          {renderChart({
            settled: totals.pageCounts,
            loading: totals.loading,
            empty: totals.pageCounts?.value?.length === 0 ? 'Connect a page to compare contacts and orders.' : null,
          }, data => (
            <ColumnChart
              data={data}
              xKey="name"
              palette={palette}
              series={[{ key: 'contacts', label: 'Contacts' }, { key: 'orders', label: 'Orders' }]}
            />
          ))}
        </WidgetCard>

        <WidgetCard title="Message vs order" subtitle={`${perBar.charAt(0).toUpperCase()}${perBar.slice(1)} · ${rangeLabel}`} icon={ShoppingCart}>
          {renderChart({
            settled: ranged.messages?.error ? ranged.messages : ranged.orders,
            empty: messages?.total === 0 && !hasOrdersInRange ? `No messages or orders in ${rangePhrase}.` : null,
          }, () => (
            <ColumnChart
              data={messageVsOrder}
              palette={palette}
              series={[{ key: 'messages', label: 'Messages' }, { key: 'orders', label: 'Orders' }]}
            />
          ))}
          {!ranged.loading && (messages?.truncated || orders?.truncated) && <TruncatedNote />}
        </WidgetCard>
      </div>
    </div>
  );
}
