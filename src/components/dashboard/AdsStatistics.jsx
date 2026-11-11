import { useCallback, useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ExternalLink, Info, Megaphone, MessageCircle, MessageSquareText, RefreshCw, Send, X } from 'lucide-react';
import { startFacebookConnect } from '../../services/api';
import { META_PURCHASE_TONES, metaPurchaseFix, metaPurchaseLabel } from '../../utils/metaPurchase';
import HoverTip from '../HoverTip';
import ConversionSharing from './ConversionSharing';
import { useBusiness } from '../../context/BusinessContext';
import { apiService } from '../../services/api';
import { formatCount, formatDay, formatDayRange, formatMoney, formatPct, todayInZone } from '../../utils/ownerDashboard';
import { PERIODS, customPeriod, statsErrorMessage } from '../../utils/statsPeriods';
import { recordStatusClass } from '../customerRecordUtils';
import { CHART_THEME } from './chartTheme';
import { CountUp, RevealOnView } from './Animated';
import { Change, CustomRange, PageSelect, PeriodTabs } from './StatsControls';

const CACHE_MS = 60000;
const ORDERS_LIMIT = 20;
// Results by business, period and page for about a minute (the endpoint allows 30 calls a minute).
const cache = new Map();

const errorMessage = (error) => (error?.status === 403 && error?.message && !/business/i.test(error.message)
  ? 'Only the owner and admins can see ad results.'
  : statsErrorMessage(error, 'ad results'));

// The verdict compares how well ads turn chats into orders; it knows nothing about cost,
// so it points the owner at an ad to look at, never tells them to stop one.
const VERDICTS = {
  above_usual: { dot: 'bg-emerald-500', tone: 'text-emerald-700', text: (ad) => `Better than your other ads: ${formatCount(ad.orders)} ${ad.orders === 1 ? 'order' : 'orders'}, about ${formatCount(Math.round(ad.expected_orders))} expected` },
  usual: { dot: 'bg-slate-400', tone: 'text-slate-600', text: () => 'In line with your other ads' },
  below_usual: { dot: 'bg-amber-500', tone: 'text-amber-700', text: (ad) => `Worse than your other ads: ${formatCount(ad.orders)} ${ad.orders === 1 ? 'order' : 'orders'}, about ${formatCount(Math.round(ad.expected_orders))} expected` },
  not_enough_data: { dot: 'bg-slate-300', tone: 'text-slate-500', text: () => 'Too few orders to judge yet' },
};

const SOURCES = {
  message_ad: { label: 'Chat from ad', icon: MessageCircle },
  ad_comment: { label: 'Comment on ad', icon: MessageSquareText },
};

const METRICS = [
  { id: 'chats', label: 'Chats' },
  { id: 'orders', label: 'Orders' },
  { id: 'sales', label: 'Sales' },
];

// A Facebook post for a post_id of the form <page id>_<post id>.
const postUrl = (postId) => (postId ? `https://www.facebook.com/${postId}` : null);
const adName = (ad) => ad?.title || ad?.ad_title || `Ad ${ad?.ad_id || ''}`.trim();

const Card = ({ title, hint, action, children, className = '' }) => (
  <section className={`rounded-2xl border border-solid border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
    {(title || action) && (
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {title && <h2 className="m-0 text-[15px] font-semibold text-slate-900">{title}</h2>}
          {hint && <p className="m-0 mt-0.5 text-[12.5px] text-slate-500">{hint}</p>}
        </div>
        {action}
      </header>
    )}
    {children}
  </section>
);

const Stat = ({ label, value, figure, sub }) => (
  <div className="min-w-0 rounded-2xl border border-solid border-slate-200 bg-white p-4 shadow-sm">
    <p className="m-0 text-[12.5px] text-slate-500">{label}</p>
    <p className="m-0 mt-1 truncate text-[22px] font-semibold tabular-nums text-slate-900"><CountUp text={value} /></p>
    <div className="mt-0.5 flex min-h-[18px] flex-wrap items-center gap-x-2 text-[12px] text-slate-500">
      {figure && <Change figure={figure} />}
      {sub && <span>{sub}</span>}
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

/**
 * Ads (GET /v1/statistics/ads and /ads/orders): per Send-message ad, the chats it opened,
 * the orders that followed, sales and a verdict, plus the orders themselves. Owners and
 * admins only. Ad spend isn't known here; the ad ID finds it in Ads Manager.
 * @param {{ pages?: object[], isActive?: boolean, isDark?: boolean, isOwner?: boolean,
 *   onNavigate?: (target: object) => void, focusRequest?: { adId?: string, nonce?: number } | null,
 *   onPagesChanged?: () => void, onReconnect?: () => void }} props
 */
export default function AdsStatistics({ pages = [], isActive = true, isDark = false, isOwner = false, onNavigate, focusRequest = null, onPagesChanged, onReconnect }) {
  const { business } = useBusiness();
  const businessId = business?.business_id || '';
  const [periodId, setPeriodId] = useState('last_7_days');
  const [customRange, setCustomRange] = useState({ start_date: '', end_date: '' });
  const [pageId, setPageId] = useState('');
  const [metric, setMetric] = useState('chats');
  const [adFilter, setAdFilter] = useState(null);
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const [orders, setOrders] = useState({ key: null, rows: [], pagination: null, loading: false, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const forceRef = useRef(false);
  const ordersRef = useRef(null);

  const timeZone = result.data?.range?.timezone || business?.timezone || undefined;
  const today = todayInZone(timeZone);
  const isCustom = periodId === 'custom' && Boolean(customRange.start_date);
  const period = isCustom ? customPeriod(customRange.start_date, customRange.end_date, today) : PERIODS.find(item => item.id === periodId) || PERIODS[1];
  const periodKey = isCustom ? `${customRange.start_date}..${customRange.end_date}` : period.id;
  const selectedPageId = pageId && pages.some(page => page.page_id === pageId) ? pageId : '';
  const requestKey = `${businessId}|${periodKey}|${selectedPageId}|${reloadKey}`;

  // "Came from an ad" on an order opens this section on that ad's orders.
  useEffect(() => {
    if (!focusRequest?.adId) return;
    setAdFilter(focusRequest.adId);
    requestAnimationFrame(() => ordersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [focusRequest?.adId, focusRequest?.nonce]);

  useEffect(() => {
    if (!isActive) return undefined;
    const cacheKey = `${businessId}|${periodKey}|${selectedPageId}`;
    const cached = cache.get(cacheKey);
    const force = forceRef.current;
    forceRef.current = false;
    const fresh = !force && cached && Date.now() - cached.at < CACHE_MS;
    const controller = new AbortController();
    const request = fresh
      ? Promise.resolve(cached.data)
      : apiService.getAdsStatistics({
        ...(isCustom ? { startDate: customRange.start_date, endDate: customRange.end_date } : { period: period.id }),
        pageId: selectedPageId || null,
      }, { signal: controller.signal });
    request
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!fresh) cache.set(cacheKey, { data, at: Date.now() });
        setResult({ key: requestKey, data, error: '' });
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === 'AbortError') return;
        if (error?.status === 404 && selectedPageId) setPageId('');
        setResult(current => ({ key: requestKey, data: error?.status === 403 ? null : current.data, error: errorMessage(error) }));
      });
    return () => controller.abort();
  // requestKey and periodKey carry the period, custom days and page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, isActive, periodKey, requestKey, selectedPageId]);

  // The orders list follows the figures' days (range), the page and the ad filter.
  const range = result.key === requestKey ? result.data?.range : null;
  const ordersKey = range ? `${requestKey}|${range.start_date}|${range.end_date}|${adFilter || ''}` : null;
  const loadOrders = useCallback((cursor = null) => {
    if (!ordersKey) return;
    const key = ordersKey;
    setOrders(current => ({ ...(cursor && current.key === key ? current : { rows: [], pagination: null }), key, loading: true, error: '' }));
    apiService.getAdOrders({
      startDate: range.start_date, endDate: range.end_date, pageId: selectedPageId || null, adId: adFilter, limit: ORDERS_LIMIT, cursor,
    })
      .then(page => setOrders(current => (current.key !== key ? current : {
        key, rows: [...(cursor ? current.rows : []), ...(page?.orders || [])], pagination: page?.pagination || null, loading: false, error: '',
      })))
      .catch(error => setOrders(current => (current.key !== key ? current : { ...current, loading: false, error: errorMessage(error) })));
  // range is read through ordersKey.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersKey]);
  useEffect(() => {
    if (isActive && ordersKey) loadOrders();
  }, [isActive, ordersKey, loadOrders]);

  const reload = useCallback(() => {
    forceRef.current = true;
    setReloadKey(key => key + 1);
  }, []);

  if (!isActive) return null;

  const isLoading = result.key !== requestKey;
  const { data } = result;
  const currency = data?.range?.currency || business?.currency || 'BDT';
  const totals = data?.totals;
  const ads = data?.ads || [];
  const hasAds = ads.length > 0 || Number(totals?.chats?.value) > 0 || Number(totals?.orders?.value) > 0;
  const comparison = data?.range?.previous && totals?.chats?.previous != null
    ? `Arrows compare with ${period.compare} (${formatDayRange(data.range.previous.start_date, data.range.previous.end_date)}).`
    : data ? 'No comparison yet: there is no ad data for the days before.' : '';
  const palette = isDark ? CHART_THEME.dark : CHART_THEME.light;
  const metricLabel = METRICS.find(item => item.id === metric)?.label || 'Chats';
  const chartData = (data?.daily || []).map(day => ({ label: formatDay(day.date), value: Number(day[metric]) || 0 }));
  const formatMetric = metric === 'sales'
    ? value => formatMoney(value, currency)
    : value => `${formatCount(value)} ${metric === 'chats' ? (value === 1 ? 'chat' : 'chats') : (value === 1 ? 'order' : 'orders')}`;
  const filteredAd = adFilter ? ads.find(ad => ad.ad_id === adFilter) || { ad_id: adFilter } : null;
  const orderRows = orders.key === ordersKey ? orders.rows : [];
  const ordersPagination = orders.key === ordersKey ? orders.pagination : null;
  const ordersLoading = orders.key !== ordersKey || orders.loading;
  const ordersByDay = orderRows.reduce((groups, order) => {
    const last = groups[groups.length - 1];
    if (last && last.day === order.local_date) last.rows.push(order);
    else groups.push({ day: order.local_date, rows: [order] });
    return groups;
  }, []);
  // Until a Facebook page sends purchases, the switch sits near the top so the owner sees it.
  const sharingSetUp = pages.some(page => page.platform !== 'ig' && page.platform !== 'instagram' && page.is_conversion_sharing_enabled);
  const sharingCard = <ConversionSharing pages={pages} isOwner={isOwner} onPagesChanged={onPagesChanged} onReconnect={onReconnect} />;
  const showAdOrders = (adId) => {
    setAdFilter(adId);
    requestAnimationFrame(() => ordersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="ads-statistics dashboard-content-area w-full flex-1 bg-surface-bright text-left">
      <div className="mx-auto w-full max-w-[980px] space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="m-0 text-[20px] font-semibold text-slate-900">Ads</h1>
            <p className="m-0 mt-0.5 text-[13px] text-slate-500">Which Send-message ads bring orders, not just chats.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pages.length > 1 && <PageSelect pages={pages} value={selectedPageId} onChange={setPageId} />}
            <PeriodTabs value={isCustom ? null : periodId} onChange={setPeriodId} />
            <CustomRange active={isCustom} range={customRange} today={today} onApply={(next) => { setCustomRange(next); setPeriodId('custom'); }} />
            <button
              type="button"
              onClick={reload}
              disabled={isLoading}
              aria-label="Refresh ad results"
              title="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-solid border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {result.error && !isLoading && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-solid border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800" role="alert">
            <span className="flex items-center gap-2"><AlertTriangle size={15} aria-hidden="true" />{result.error}</span>
            <button type="button" onClick={reload} className="h-8 rounded-lg border border-solid border-rose-200 bg-white px-3 text-[12px] font-semibold text-rose-800 hover:bg-rose-100">Try again</button>
          </div>
        )}

        {!data ? (isLoading ? (
          <div className="space-y-3" aria-hidden="true">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-slate-100" />)}</div>
            <div className="h-[280px] animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : null) : !hasAds ? (
          <Card>
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <Megaphone size={28} className="text-slate-400" aria-hidden="true" />
              <p className="m-0 mt-3 text-[15px] font-semibold text-slate-900">No chats from ads {period.phrase === 'today' ? 'today' : `in ${period.phrase}`}</p>
              <p className="m-0 mt-1 max-w-md text-[13px] leading-relaxed text-slate-500">
                An ad shows up here once a customer opens a chat from a Send-message ad. LyfFlow started counting when this section went live,
                so older ad chats aren't included. {Number(totals?.all_orders) > 0 && `${formatCount(totals.all_orders)} ${totals.all_orders === 1 ? 'order' : 'orders'} in these days came without an ad.`}
              </p>
            </div>
          </Card>
        ) : null}
        {data && !hasAds && sharingCard}
        {data && hasAds && (
          <div className={`space-y-4 transition-opacity ${isLoading ? 'opacity-60' : ''}`} aria-busy={isLoading}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Chats from ads" value={formatCount(totals.chats.value)} figure={totals.chats} />
              <Stat
                label="Orders from ads"
                value={formatCount(totals.orders.value)}
                figure={totals.orders}
                sub={`of ${formatCount(totals.all_orders)} orders`}
              />
              <Stat label="Sales from ads" value={formatMoney(totals.sales.value, currency)} figure={totals.sales} />
              <Stat
                label="Chats that ordered"
                value={formatPct(totals.chat_to_order_rate)}
                sub={totals.orders_after_comment > 0 ? `${formatCount(totals.orders_after_comment)} ${totals.orders_after_comment === 1 ? 'order' : 'orders'} after a comment` : null}
              />
            </div>
            {comparison && <p className="m-0 -mt-1 text-[12px] text-slate-500">{comparison}</p>}
            {(Number(totals.purchases_sent) > 0 || Number(totals.purchases_failed) > 0) && (
              <p className="ads-purchases m-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-solid border-slate-200 bg-white px-3.5 py-2.5 text-[12.5px] text-slate-600">
                <Send size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                <span>
                  {formatCount(totals.purchases_sent)} {totals.purchases_sent === 1 ? 'purchase' : 'purchases'} sent to Meta, {formatCount(totals.ad_purchases_sent)} of them from ads.
                </span>
                {Number(totals.purchases_failed) > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                    <AlertTriangle size={13} aria-hidden="true" />
                    {formatCount(totals.purchases_failed)} failed. The orders below say why.
                  </span>
                )}
              </p>
            )}

            {!sharingSetUp && sharingCard}

            <Card
              title="By day"
              hint={metric === 'chats' ? 'Chats opened from an ad each day. A chat from ads on two days counts on both.' : metric === 'orders' ? 'Orders that belong to an ad, by the day they were placed.' : 'Order totals, delivery included, by the day they were placed.'}
              action={(
                <div role="tablist" aria-label="Figure" className="inline-flex h-8 items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
                  {METRICS.map(item => (
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
              )}
            >
              <div className="h-[220px]">
                <RevealOnView className="h-full"><ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
                    <CartesianGrid vertical={false} stroke={palette.grid} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: palette.axis, fontSize: 11 }} minTickGap={12} />
                    <YAxis tickLine={false} axisLine={false} width={metric === 'sales' ? 64 : 36} tick={{ fill: palette.axis, fontSize: 11 }} allowDecimals={false}
                      tickFormatter={value => (metric === 'sales' ? formatMoney(value, currency, { compact: true }) : formatCount(value))} />
                    <Tooltip cursor={{ fill: palette.cursor }} content={<ChartTooltip format={formatMetric} />} />
                    <Bar dataKey="value" name={metricLabel} fill={palette.series[0]} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer></RevealOnView>
              </div>
            </Card>

            <Card title="Ads" hint="Sorted by chats. Use the ad ID to find an ad and its spend in Ads Manager.">
              <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-solid border-slate-200 text-[12px] text-slate-500">
                      <th scope="col" className="py-2 pr-3 font-medium">Ad</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Chats</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Orders</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Sales</th>
                      <th scope="col" className="py-2 pl-3 text-right font-medium">Chats that ordered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ads.map((ad) => {
                      const verdict = VERDICTS[ad.verdict] || VERDICTS.not_enough_data;
                      const link = postUrl(ad.post_id);
                      return (
                        <tr key={ad.ad_id} className={`border-b border-solid border-slate-100 align-top last:border-0 ${adFilter === ad.ad_id ? 'bg-emerald-50/60' : ''}`}>
                          <td className="py-3 pr-3">
                            <p className="m-0 font-semibold text-slate-900 [overflow-wrap:anywhere]">{ad.title || <span className="font-mono text-[12.5px]">Ad {ad.ad_id}</span>}</p>
                            <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-slate-400">
                              {ad.title && <span className="font-mono">ID {ad.ad_id}</span>}
                              {link && (
                                <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-slate-500 hover:text-slate-900 hover:underline">
                                  Post <ExternalLink size={11} aria-hidden="true" />
                                </a>
                              )}
                              {ad.orders > 0 && (
                                <button type="button" onClick={() => showAdOrders(ad.ad_id)} className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline">
                                  See orders
                                </button>
                              )}
                            </p>
                            <p className={`m-0 mt-1.5 flex items-center gap-1.5 text-[12px] ${verdict.tone}`}>
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${verdict.dot}`} aria-hidden="true" />
                              {verdict.text(ad)}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-700">{formatCount(ad.chats)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-900">
                            <span className="font-semibold">{formatCount(ad.orders)}</span>
                            {ad.orders_after_comment > 0 && <span className="block text-[11.5px] text-slate-400">{formatCount(ad.orders_after_comment)} after a comment</span>}
                            {ad.purchases_sent > 0 && <span className="block text-[11.5px] text-slate-400">{formatCount(ad.purchases_sent)} sent to Meta</span>}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-700">{formatMoney(ad.sales, currency)}</td>
                          <td className="py-3 pl-3 text-right tabular-nums text-slate-700">{formatPct(ad.chat_to_order_rate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="m-0 mt-3 flex gap-1.5 text-[11.5px] leading-relaxed text-slate-500">
                <Info size={13} className="mt-[2px] shrink-0" aria-hidden="true" />
                <span>
                  The verdict compares how well each ad turns chats into orders against your other ads. It doesn't know what an ad costs:
                  an ad marked worse can still be cheap per order, so check it in Ads Manager before changing it.
                </span>
              </p>
            </Card>

            <div ref={ordersRef} className="scroll-mt-4">
              <Card
                title="Orders from ads"
                hint={`${formatDayRange(data.range.start_date, data.range.end_date)}${ordersPagination ? ` · ${formatCount(ordersPagination.total)} ${ordersPagination.total === 1 ? 'order' : 'orders'}` : ''}`}
                action={filteredAd && (
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 py-1 pl-2.5 pr-1 text-[12px] font-semibold text-emerald-800">
                    <span className="truncate">{adName(filteredAd)}</span>
                    <button type="button" onClick={() => setAdFilter(null)} aria-label="Show orders from every ad" className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-emerald-100">
                      <X size={12} />
                    </button>
                  </span>
                )}
              >
                {orders.error && orders.key === ordersKey && (
                  <p className="m-0 mb-3 text-[12.5px] text-rose-700" role="alert">{orders.error}</p>
                )}
                {orderRows.length === 0 ? (
                  <p className="m-0 py-6 text-center text-[13px] text-slate-500">
                    {ordersLoading ? 'Loading orders…' : filteredAd ? 'No orders from this ad in these days.' : 'No orders from ads in these days.'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {ordersByDay.map(group => (
                      <div key={group.day}>
                        <p className="m-0 mb-1.5 text-[12px] font-semibold text-slate-500">{formatDay(group.day, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                        <ul className="m-0 list-none divide-y divide-slate-100 rounded-xl border border-solid border-slate-200 p-0">
                          {group.rows.map((order) => {
                            const source = SOURCES[order.ad_source] || SOURCES.message_ad;
                            const purchase = metaPurchaseLabel(order);
                            const fix = purchase?.error ? metaPurchaseFix(purchase.error) : null;
                            return (
                              <li key={order.customer_order_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-[13px]">
                                <button
                                  type="button"
                                  onClick={() => onNavigate?.({ tab: 'customer-orders', recordType: 'order', recordId: order.customer_order_id })}
                                  className="min-w-0 flex-1 text-left"
                                  title="Open the order"
                                >
                                  <span className="block truncate font-semibold text-slate-900">{order.order_id} · {order.contact_name || 'Customer'}</span>
                                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-slate-500">
                                    <span className="inline-flex items-center gap-1"><source.icon size={12} aria-hidden="true" />{source.label}</span>
                                    {!filteredAd && <span className="truncate">{order.ad_title || `Ad ${order.ad_id}`}</span>}
                                  </span>
                                </button>
                                {purchase && (
                                  <HoverTip
                                    text={purchase.error ? `${purchase.long}: ${purchase.error}` : purchase.long}
                                    className={`inline-flex items-center gap-1 text-[11.5px] font-semibold ${META_PURCHASE_TONES[purchase.tone]}`}
                                  >
                                    <Send size={11} aria-hidden="true" />{purchase.short}
                                  </HoverTip>
                                )}
                                {fix === 'connect_ads' && isOwner && (
                                  <button type="button" onClick={() => startFacebookConnect({ includeInstagram: pages.some(page => page.platform === 'ig' || page.platform === 'instagram'), includeAds: true })} className="text-[11.5px] font-semibold text-emerald-700 hover:underline">Connect ads</button>
                                )}
                                {fix === 'reconnect' && onReconnect && (
                                  <button type="button" onClick={onReconnect} className="text-[11.5px] font-semibold text-emerald-700 hover:underline">Reconnect</button>
                                )}
                                <span className={`rounded-md border border-solid px-1.5 py-0.5 text-[10.5px] font-semibold capitalize ${recordStatusClass(order.status)}`}>{String(order.status || '').replace(/_/g, ' ')}</span>
                                <span className="w-24 text-right font-semibold tabular-nums text-slate-900">{formatMoney(order.total, currency)}</span>
                                {order.conversation_id && (
                                  <button
                                    type="button"
                                    onClick={() => onNavigate?.({ tab: 'conversation', pageId: order.page_id, conversationId: order.conversation_id })}
                                    className="text-[12px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                                  >
                                    Open chat
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                    {ordersPagination?.has_more && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => loadOrders(ordersPagination.next_cursor)}
                          disabled={ordersLoading}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-solid border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
                        >
                          {ordersLoading ? 'Loading…' : `Show more (${formatCount(ordersPagination.total - orderRows.length)} left)`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {sharingSetUp && sharingCard}

            <details className="ads-notes rounded-2xl border border-solid border-slate-200 bg-white px-4 py-3 text-[12.5px] text-slate-600 shadow-sm sm:px-5">
              <summary className="cursor-pointer font-semibold text-slate-800">How ads are counted</summary>
              <ul className="m-0 mt-2 list-disc space-y-1 pl-5 leading-relaxed">
                <li>An order belongs to the ad the customer last tapped in the 7 days before ordering, or, if they tapped none, the ad whose post they commented on. Cancelled and deleted orders are left out.</li>
                <li>A customer who tapped an ad three times is one chat.</li>
                <li>An ad is listed once a customer has opened a chat from it. An ad that brought no chat isn't known to LyfFlow.</li>
                <li>A customer who saw an ad and wrote to the page on their own counts as a customer without an ad.</li>
                <li>Orders after a comment are counted for Facebook pages only, while the comment agent is on for the page.</li>
                <li>Every Send-message ad is listed, whatever its campaign type: Meta doesn't send the campaign with the click.</li>
                <li>Sales are order totals with delivery. Ad spend isn't read yet; find it in Ads Manager with the ad ID.</li>
              </ul>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
