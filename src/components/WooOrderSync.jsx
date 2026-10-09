import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Store, UploadCloud } from 'lucide-react';
import { apiService } from '../services/api';
import { wooOrderAdminUrl } from '../utils/woocommerce';

const formatWhen = (value) => {
  if (!value) return null;
  const text = String(value);
  const date = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(text) || !text.includes('T') ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const pushErrorText = (err) => (err?.status === 429
  ? 'Too many pushes in a minute. Wait a moment and try again.'
  : err?.message || 'Could not push the order.');

// WooCommerce sync state for one order (from OrderResponseDetail's wc_* fields):
// synced → link into WP admin; failed → the error and Retry push; otherwise local only.
// Orders are pushed automatically when created; the button is for failures and nudges.
export function WooOrderSyncPanel({ order, storeUrl, canPush, onPushed }) {
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState(null); // { tone, text }
  const orderId = order.customer_order_id || order.id;
  const synced = order.wc_order_id != null;
  const failed = !synced && Boolean(order.wc_sync_error);
  const adminUrl = wooOrderAdminUrl(storeUrl, order.wc_order_id);

  // A different order opened in the same panel starts clean.
  useEffect(() => { setResult(null); }, [orderId]);

  const push = async () => {
    setPushing(true);
    setResult(null);
    try {
      const response = await apiService.pushWooOrder(orderId);
      setResult({
        tone: 'success',
        text: response?.wc_order_id ? `Pushed to WooCommerce as order #${response.wc_order_id}.` : (response?.message || 'Push started.'),
      });
      onPushed?.();
    } catch (err) {
      setResult({ tone: 'error', text: pushErrorText(err) });
    } finally {
      setPushing(false);
    }
  };

  const tone = synced ? 'synced' : failed ? 'failed' : 'local';
  const Icon = synced ? CheckCircle2 : failed ? AlertTriangle : Store;

  return (
    <section aria-label="WooCommerce sync" className={`woo-order-sync is-${tone} rounded-2xl border p-4 ${synced ? 'border-emerald-200 bg-emerald-50/50' : failed ? 'border-red-200 bg-red-50/60' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon size={17} className={`mt-0.5 shrink-0 ${synced ? 'text-emerald-600' : failed ? 'text-red-600' : 'text-slate-400'}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="m-0 text-sm font-semibold text-slate-900">
              {synced && <>Synced to WooCommerce <span className="font-normal text-slate-600">· WC #{order.wc_order_id}</span></>}
              {failed && 'WooCommerce sync failed'}
              {!synced && !failed && 'Local only'}
            </p>
            <p className="mb-0 mt-0.5 text-xs leading-5 text-slate-600">
              {synced && (formatWhen(order.wc_synced_at) ? `Pushed ${formatWhen(order.wc_synced_at)}.` : 'This order is in your store.')}
              {failed && order.wc_sync_error}
              {!synced && !failed && 'This order hasn\'t been sent to your WooCommerce store.'}
            </p>
            {failed && order.wc_sync_attempts > 0 && (
              <p className="mb-0 mt-0.5 text-[11px] text-slate-500">{order.wc_sync_attempts} {order.wc_sync_attempts === 1 ? 'attempt' : 'attempts'} so far</p>
            )}
          </div>
        </div>

        {synced && adminUrl && (
          <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-700 no-underline hover:bg-emerald-50">
            Open in WooCommerce <ExternalLink size={13} />
          </a>
        )}
        {!synced && canPush && (
          <button
            type="button"
            onClick={push}
            disabled={pushing}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${failed ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-500'}`}
          >
            {pushing ? <Loader2 size={13} className="animate-spin" /> : failed ? <RefreshCw size={13} /> : <UploadCloud size={13} />}
            {pushing ? 'Pushing…' : failed ? 'Retry push' : 'Push to WooCommerce'}
          </button>
        )}
      </div>
      {!synced && !canPush && (
        <p className="mb-0 mt-2 text-[11px] text-slate-500">Connect your store in Platforms → WooCommerce to push orders.</p>
      )}
      {result && (
        <p role={result.tone === 'error' ? 'alert' : 'status'} className={`mb-0 mt-2 text-xs font-medium ${result.tone === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{result.text}</p>
      )}
    </section>
  );
}

// Owner-only: queues every unsynced order for the store in one go.
export function WooBulkPushButton({ onPushed }) {
  const [state, setState] = useState({ status: 'idle', text: '' });
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const run = async () => {
    setState({ status: 'pushing', text: '' });
    clearTimeout(timer.current);
    try {
      const response = await apiService.bulkPushWooOrders();
      const count = Number(response?.queued_count) || 0;
      setState({ status: 'done', text: count === 0 ? 'Every order is already in WooCommerce.' : `Queued ${count} ${count === 1 ? 'order' : 'orders'} for WooCommerce.` });
      onPushed?.();
    } catch (err) {
      setState({ status: 'error', text: err?.status === 429 ? 'Too many bulk pushes. Try again in a minute.' : err?.message || 'Could not push orders.' });
    }
    timer.current = setTimeout(() => setState({ status: 'idle', text: '' }), 6000);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={state.status === 'pushing'}
        title="Send every order that isn't in your WooCommerce store yet"
        className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60"
      >
        {state.status === 'pushing' ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        {state.status === 'pushing' ? 'Pushing…' : 'Push unsynced to WooCommerce'}
      </button>
      {state.text && (
        <span role={state.status === 'error' ? 'alert' : 'status'} className={`text-xs font-semibold ${state.status === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{state.text}</span>
      )}
    </div>
  );
}
