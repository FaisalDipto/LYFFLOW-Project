import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, PackageOpen, RefreshCw } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { apiService } from '../../services/api';
import { formatCount, formatDayRange, formatMoney, todayInZone } from '../../utils/ownerDashboard';
import { PERIODS, customPeriod, statsErrorMessage } from '../../utils/statsPeriods';
import { CountUp, GrowBar } from './Animated';
import { Change, CustomRange, PageSelect, PeriodTabs } from './StatsControls';

const errorMessage = (error) => statsErrorMessage(error, 'product sales');

const CACHE_MS = 60000;
// Product rows per request (the API's maximum); later pages come from "Show more".
const PAGE_LIMIT = 100;

// Results by business, period and page for about a minute, so flipping between
// filters doesn't spend the 30-a-minute limit.
const cache = new Map();

const TopProduct = ({ product, period, currency }) => (
  <div className="product-sales-top rounded-xl border border-solid border-emerald-500/70 p-4">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="m-0 text-[12px] text-slate-500">Most selling, {period.phrase}</p>
        <p className="m-0 mt-1 text-[19px] font-semibold leading-snug text-slate-900 [overflow-wrap:anywhere]">{product.name}</p>
        <p className="m-0 mt-1 text-[12.5px] tabular-nums text-slate-500">
          <CountUp text={`${formatMoney(product.sales_value.value, currency)} · ${formatCount(product.orders.value)} ${product.orders.value === 1 ? 'order' : 'orders'}`} />
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="m-0 text-[32px] font-bold leading-none tabular-nums text-emerald-600"><CountUp text={formatCount(product.pieces.value)} /></p>
        <p className="m-0 mt-1 text-[12px] text-slate-500">{product.pieces.value === 1 ? 'piece' : 'pieces'}</p>
        <Change figure={product.pieces} allowNew className="mt-0.5" />
      </div>
    </div>
  </div>
);

const ProductRow = ({ product, topPieces, currency }) => {
  const width = topPieces > 0 ? Math.max(1.5, Math.min(100, (product.pieces.value / topPieces) * 100)) : 0;
  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[13px]">
        <span className="min-w-0 font-medium text-slate-900 [overflow-wrap:anywhere]">{product.name}</span>
        <span className="flex flex-wrap items-baseline justify-end gap-x-1.5 tabular-nums text-slate-600">
          <span><CountUp text={`${formatCount(product.pieces.value)} pieces · ${formatCount(product.orders.value)} ${product.orders.value === 1 ? 'order' : 'orders'} · ${formatMoney(product.sales_value.value, currency)}`} /></span>
          <Change figure={product.pieces} allowNew />
        </span>
      </div>
      <div
        className="product-sales-track mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${formatCount(product.pieces.value)} pieces, ${Math.round(width)}% of the most selling product`}
      >
        <GrowBar className="h-full rounded-full bg-emerald-600" width={`${width}%`} />
      </div>
    </li>
  );
};

const Totals = ({ totals, currency }) => (
  <dl className="m-0 grid grid-cols-3 gap-3">
    {[
      ['Pieces sold', formatCount(totals.pieces.value), totals.pieces],
      ['Orders', formatCount(totals.orders.value), totals.orders],
      ['Sales value', formatMoney(totals.sales_value.value, currency), totals.sales_value],
    ].map(([label, value, figure]) => (
      <div key={label} className="min-w-0">
        <dt className="text-[12px] text-slate-500">{label}</dt>
        <dd className="m-0 mt-0.5 truncate text-[17px] font-semibold tabular-nums text-slate-900"><CountUp text={value} /></dd>
        <dd className="m-0 min-h-[18px]"><Change figure={figure} /></dd>
      </div>
    ))}
  </dl>
);

const Skeleton = () => (
  <div className="space-y-3" aria-hidden="true">
    <div className="h-[104px] animate-pulse rounded-xl bg-slate-100" />
    <div className="h-[220px] animate-pulse rounded-xl bg-slate-100" />
  </div>
);

/**
 * Product sales (GET /v1/statistics/product-sales): the most selling product, the rest
 * ranked with bars against it, and the totals, for today / 7 / 30 days and one or all pages.
 * Open to every member of the business.
 * @param {{ pages?: { page_id: string, name?: string }[], isActive?: boolean }} props
 */
export default function ProductSalesStatistics({ pages = [], isActive = true }) {
  const { business } = useBusiness();
  const businessId = business?.business_id || '';
  const [periodId, setPeriodId] = useState('last_7_days');
  // The custom days, used while periodId is 'custom'.
  const [customRange, setCustomRange] = useState({ start_date: '', end_date: '' });
  const [pageId, setPageId] = useState('');
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  // Rows from "Show more" for the current request: appended after the first page.
  const [more, setMore] = useState({ key: null, products: [], pagination: null, loading: false, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const forceRef = useRef(false);
  // "Today" is the business's day: range.timezone once figures arrive, else the profile's.
  const timeZone = result.data?.range?.timezone || business?.timezone || undefined;
  const today = todayInZone(timeZone);
  const isCustom = periodId === 'custom' && Boolean(customRange.start_date);
  const period = isCustom
    ? customPeriod(customRange.start_date, customRange.end_date, today)
    : PERIODS.find(item => item.id === periodId) || PERIODS[1];
  const periodKey = isCustom ? `${customRange.start_date}..${customRange.end_date}` : period.id;
  // A page removed from the business falls back to all pages.
  const selectedPageId = pageId && pages.some(page => page.page_id === pageId) ? pageId : '';
  const requestKey = `${businessId}|${periodKey}|${selectedPageId}|${reloadKey}`;

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
      : apiService.getProductSales(salesQuery(), { signal: controller.signal });
    request
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!fresh) cache.set(cacheKey, { data, at: Date.now() });
        setResult({ key: requestKey, data, error: '' });
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === 'AbortError') return;
        if (error?.status === 404 && selectedPageId) setPageId('');
        setResult(current => ({ key: requestKey, data: current.data, error: errorMessage(error) }));
      });
    return () => controller.abort();
  // requestKey and periodKey carry the period, custom days and page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, isActive, periodKey, requestKey, selectedPageId]);

  // The filters as the API takes them; the same for every page of one request.
  function salesQuery(cursor = null) {
    return {
      ...(isCustom ? { startDate: customRange.start_date, endDate: customRange.end_date } : { period: period.id }),
      pageId: selectedPageId || null,
      limit: PAGE_LIMIT,
      cursor,
    };
  }

  const reload = useCallback(() => {
    forceRef.current = true;
    setReloadKey(key => key + 1);
  }, []);

  // The last figures stay on screen (dimmed) while the next ones load.
  const isLoading = result.key !== requestKey;
  const state = { status: isLoading ? 'loading' : result.error ? 'error' : 'ready', data: result.data, error: result.error };

  if (!isActive) return null;

  const { data } = state;
  const currency = data?.range?.currency || business?.currency || 'BDT';
  // Pages loaded with "Show more" only count while they belong to the figures on screen.
  const extra = more.key === requestKey ? more : { products: [], pagination: null, loading: false, error: '' };
  const products = [...(data?.products || []), ...extra.products];
  const [topProduct, ...others] = products;
  const pagination = extra.pagination || data?.pagination || null;
  const totalProducts = data?.pagination?.total ?? products.length;
  const loadMore = () => {
    if (!pagination?.next_cursor || extra.loading) return;
    const key = requestKey;
    setMore({ ...extra, key, loading: true, error: '' });
    apiService.getProductSales(salesQuery(pagination.next_cursor))
      .then(page => setMore(current => (current.key !== key ? current : {
        key, products: [...current.products, ...(page?.products || [])], pagination: page?.pagination || null, loading: false, error: '',
      })))
      .catch(error => setMore(current => (current.key !== key ? current : { ...current, loading: false, error: errorMessage(error) })));
  };
  const comparison = data?.range?.previous
    ? `Arrows compare with ${period.compare} (${formatDayRange(data.range.previous.start_date, data.range.previous.end_date)}).`
    : '';
  const applyCustom = (range) => {
    setCustomRange(range);
    setPeriodId('custom');
  };

  return (
    <div className="product-sales dashboard-content-area w-full flex-1 bg-surface-bright text-left">
      <div className="mx-auto w-full max-w-[680px]">
        <section className="rounded-2xl border border-solid border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-busy={state.status === 'loading'}>
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="m-0 text-[18px] font-semibold text-slate-900">Product sales</h1>
            <div className="flex flex-wrap items-center gap-2">
              {pages.length > 1 && <PageSelect pages={pages} value={selectedPageId} onChange={setPageId} />}
              <PeriodTabs value={isCustom ? null : periodId} onChange={setPeriodId} />
              <CustomRange active={isCustom} range={customRange} today={today} onApply={applyCustom} />
              <button
                type="button"
                onClick={reload}
                disabled={state.status === 'loading'}
                aria-label="Refresh product sales"
                title="Refresh"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-solid border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw size={15} className={state.status === 'loading' ? 'animate-spin' : ''} />
              </button>
            </div>
          </header>

          {state.status === 'error' && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-solid border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800" role="alert">
              <span className="flex items-center gap-2"><AlertTriangle size={15} aria-hidden="true" />{state.error}</span>
              <button type="button" onClick={reload} className="h-8 rounded-lg border border-solid border-rose-200 bg-white px-3 text-[12px] font-semibold text-rose-800 hover:bg-rose-100">
                Try again
              </button>
            </div>
          )}

          {!data ? (state.status === 'loading' ? <Skeleton /> : null) : (
            <div className={`space-y-3 transition-opacity ${state.status === 'loading' ? 'opacity-60' : ''}`}>
              {comparison && topProduct && <p className="m-0 -mt-1 text-[12px] text-slate-500">{comparison}</p>}
              {!topProduct ? (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center">
                  <PackageOpen size={28} className="text-slate-400" aria-hidden="true" />
                  <p className="m-0 mt-3 text-[14px] font-semibold text-slate-900">No products sold {period.phrase}</p>
                  <p className="m-0 mt-1 max-w-sm text-[12.5px] text-slate-500">
                    Pieces show up here as soon as they are on an order. Try {isCustom ? 'other days' : 'a longer period'}{selectedPageId ? ' or all pages' : ''}.
                  </p>
                </div>
              ) : (
                <>
                  <TopProduct product={topProduct} period={period} currency={currency} />
                  <div className="rounded-xl border border-solid border-slate-200 p-4">
                    {others.length > 0 && (
                      <ol className="m-0 mb-4 list-none space-y-3.5 p-0">
                        {others.map((product, index) => (
                          <ProductRow key={`${product.code || ''}|${product.name}|${index}`} product={product} topPieces={topProduct.pieces.value} currency={currency} />
                        ))}
                      </ol>
                    )}
                    {(pagination?.has_more || extra.error) && (
                      <div className="product-sales-more mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                        <span className={`text-[12.5px] ${extra.error ? 'text-rose-700' : 'text-slate-500'}`} aria-live="polite">
                          {extra.error || `Showing ${formatCount(products.length)} of ${formatCount(totalProducts)} products`}
                        </span>
                        {pagination?.has_more && (
                          <button
                            type="button"
                            onClick={loadMore}
                            disabled={extra.loading}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-solid border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
                          >
                            {extra.loading && <RefreshCw size={13} className="animate-spin" aria-hidden="true" />}
                            {extra.loading ? 'Loading…' : extra.error ? 'Try again' : `Show ${formatCount(Math.min(PAGE_LIMIT, totalProducts - products.length))} more`}
                          </button>
                        )}
                      </div>
                    )}
                    <div className={others.length > 0 ? 'border-t border-solid border-slate-200 pt-4' : ''}>
                      <Totals totals={data.totals} currency={currency} />
                    </div>
                  </div>
                </>
              )}

              <p className="m-0 flex gap-1.5 text-[11.5px] leading-relaxed text-slate-500">
                <Info size={13} className="mt-[2px] shrink-0" aria-hidden="true" />
                <span>
                  These can differ from the dashboard. Sales value is price × quantity, while dashboard revenue is order totals
                  including delivery. Orders here only count orders with a product on them. A product saved under two codes or
                  spellings shows as two rows.
                </span>
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
