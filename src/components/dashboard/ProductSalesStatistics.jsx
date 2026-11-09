import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronDown, Info, PackageOpen, RefreshCw } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { apiService } from '../../services/api';
import { formatCount, formatDayRange, formatMoney } from '../../utils/ownerDashboard';
import { CountUp, GrowBar } from './Animated';

const PERIODS = [
  { id: 'today', label: 'Today', phrase: 'today', compare: 'yesterday up to this time' },
  { id: 'last_7_days', label: '7 days', phrase: 'last 7 days', compare: 'the 7 days before' },
  { id: 'last_30_days', label: '30 days', phrase: 'last 30 days', compare: 'the 30 days before' },
];
const CACHE_MS = 60000;

// Results by business, period and page for about a minute, so flipping between
// filters doesn't spend the 30-a-minute limit.
const cache = new Map();

/** previous is 0 / "0.00": this didn't sell in the comparison period. */
const isNew = (figure) => figure?.change_pct == null && figure?.previous != null && Number(figure.previous) === 0;

/**
 * The comparison for one figure. A number change_pct shows the arrow and percentage;
 * previous 0 shows "New" (products only); previous null shows nothing.
 */
const Change = ({ figure, allowNew = false, className = '' }) => {
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

const errorMessage = (error) => {
  if (error?.status === 403) return 'Choose a business first: product sales are shown for the active business.';
  if (error?.status === 404) return 'That page is no longer part of this business.';
  if (error?.status === 422) return 'That filter is not valid. Choose another period or page.';
  if (error?.status === 429) return 'Too many requests. Wait a minute, then try again.';
  if (error?.status === 500) return 'The figures could not be worked out right now. Try again in a moment.';
  return error?.message || 'Could not load product sales.';
};

const PageSelect = ({ pages, value, onChange }) => (
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

const PeriodTabs = ({ value, onChange }) => (
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
  const [pageId, setPageId] = useState('');
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const forceRef = useRef(false);
  const period = PERIODS.find(item => item.id === periodId) || PERIODS[1];
  // A page removed from the business falls back to all pages.
  const selectedPageId = pageId && pages.some(page => page.page_id === pageId) ? pageId : '';
  const requestKey = `${businessId}|${periodId}|${selectedPageId}|${reloadKey}`;

  useEffect(() => {
    if (!isActive) return undefined;
    const cacheKey = `${businessId}|${periodId}|${selectedPageId}`;
    const cached = cache.get(cacheKey);
    const force = forceRef.current;
    forceRef.current = false;
    const fresh = !force && cached && Date.now() - cached.at < CACHE_MS;
    const controller = new AbortController();
    const request = fresh
      ? Promise.resolve(cached.data)
      : apiService.getProductSales({ period: periodId, pageId: selectedPageId || null }, { signal: controller.signal });
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
  }, [businessId, isActive, periodId, requestKey, selectedPageId]);

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
  const products = data?.products || [];
  const [topProduct, ...others] = products;
  const comparison = data?.range?.previous
    ? `Arrows compare with ${period.compare} (${formatDayRange(data.range.previous.start_date, data.range.previous.end_date)}).`
    : '';

  return (
    <div className="product-sales dashboard-content-area w-full flex-1 bg-surface-bright text-left">
      <div className="mx-auto w-full max-w-[680px]">
        <section className="rounded-2xl border border-solid border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-busy={state.status === 'loading'}>
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="m-0 text-[18px] font-semibold text-slate-900">Product sales</h1>
            <div className="flex flex-wrap items-center gap-2">
              {pages.length > 1 && <PageSelect pages={pages} value={selectedPageId} onChange={setPageId} />}
              <PeriodTabs value={periodId} onChange={setPeriodId} />
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
                    Pieces show up here as soon as they are on an order. Try a longer period{selectedPageId ? ' or all pages' : ''}.
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
