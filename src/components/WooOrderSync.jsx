import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, Loader2, MinusCircle, RefreshCw, Store, UploadCloud } from 'lucide-react';
import { apiService } from '../services/api';
import { wooOrderAdminUrl, wooSyncStatus } from '../utils/woocommerce';

const formatWhen = (value) => {
  if (!value) return null;
  const text = String(value);
  const date = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(text) || !text.includes('T') ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// POST /v1/woocommerce/orders/{order_id}/push failures, by status.
const pushErrorText = (err) => {
  switch (err?.status) {
    case 400: return 'Connect a WooCommerce store in Platforms to push orders.';
    case 403: return 'No active business. Choose a business, then try again.';
    case 409: return 'This order is already in WooCommerce or being sent, or it was cancelled, deleted or not found.';
    case 429: return 'Too many pushes in a minute. Wait a moment and try again.';
    case 500: return "Couldn't queue the push. Try again in a moment.";
    default: return err?.message || "Couldn't push the order to WooCommerce.";
  }
};

// How each wc_sync_status reads, and whether "Push now" is offered (a manual push skips
// the 30-minute hold and ignores the store's order sync setting).
const SYNC_STATES = {
  synced: { icon: CheckCircle2, tone: 'synced', title: 'In WooCommerce', canPush: false },
  syncing: { icon: Loader2, tone: 'syncing', title: 'Sending to your store', detail: "The order can't be edited while it's being sent.", canPush: false },
  pending: { icon: Clock3, tone: 'pending', title: 'Waiting to be sent', detail: 'New orders wait 30 minutes, so the customer can still change them, then go to your store. Push now to send it straight away.', canPush: true },
  failed: { icon: AlertTriangle, tone: 'failed', title: "Couldn't be sent to WooCommerce", canPush: true },
  skipped: { icon: MinusCircle, tone: 'local', title: 'Not sent to WooCommerce', detail: 'It was cancelled or deleted, order sync was off, or the store was disconnected.', canPush: true },
  none: { icon: Store, tone: 'local', title: 'Not sent to WooCommerce', detail: 'No store was connected, or order sync was off, when this order came in.', canPush: true },
};

const TONE_CLASSES = {
  synced: { box: 'border-emerald-200 bg-emerald-50/50', icon: 'text-emerald-600' },
  syncing: { box: 'border-violet-200 bg-violet-50/60', icon: 'animate-spin text-violet-600' },
  pending: { box: 'border-amber-200 bg-amber-50/60', icon: 'text-amber-600' },
  failed: { box: 'border-red-200 bg-red-50/60', icon: 'text-red-600' },
  local: { box: 'border-slate-200 bg-slate-50', icon: 'text-slate-400' },
};

// WooCommerce push state for one order (OrderResponseDetail's wc_* fields), with a link
// into WP admin once it's in the store and "Push to WooCommerce" while it isn't. The push
// skips the 30-minute hold. `onPushed(response)` gets the success body to update the
// order; `onNotify(tone, text)` shows the outcome as a toast.
export function WooOrderSyncPanel({ order, storeUrl, canPush, onPushed, onRefresh, onNotify }) {
  const [pushing, setPushing] = useState(false);
  const orderId = order.customer_order_id || order.id;
  const status = wooSyncStatus(order);
  const view = SYNC_STATES[status || 'none'] || SYNC_STATES.none;
  const tone = TONE_CLASSES[view.tone];
  const adminUrl = wooOrderAdminUrl(storeUrl, order.wc_order_id);
  const Icon = view.icon;

  const push = async () => {
    if (pushing) return;
    setPushing(true);
    try {
      const response = await apiService.pushWooOrder(orderId);
      onNotify?.('success', response?.message || 'Sending the order to WooCommerce now.');
      onPushed?.(response);
    } catch (err) {
      onNotify?.('error', pushErrorText(err));
      // A 409 means the order moved on (pushed, cancelled…); show where it stands.
      if (err?.status === 409) onRefresh?.();
    } finally {
      setPushing(false);
    }
  };

  let detail = view.detail;
  if (status === 'synced') detail = formatWhen(order.wc_synced_at) ? `Pushed ${formatWhen(order.wc_synced_at)}. Later changes here aren't sent to the store.` : "This order is in your store. Later changes here aren't sent to it.";
  if (status === 'failed') detail = order.wc_sync_error || 'The store rejected the order.';

  return (
    <section aria-label="WooCommerce sync" className={`woo-order-sync is-${status || 'none'} rounded-2xl border p-4 ${tone.box}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon size={17} className={`mt-0.5 shrink-0 ${tone.icon}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="m-0 text-sm font-semibold text-slate-900">
              {view.title}
              {status === 'synced' && order.wc_order_id != null && <span className="font-normal text-slate-600"> · WC #{order.wc_order_id}</span>}
            </p>
            <p className="mb-0 mt-0.5 text-xs leading-5 text-slate-600">{detail}</p>
            {status === 'failed' && order.wc_sync_attempts > 0 && (
              <p className="mb-0 mt-0.5 text-[11px] text-slate-500">{order.wc_sync_attempts} {order.wc_sync_attempts === 1 ? 'attempt' : 'attempts'} so far</p>
            )}
          </div>
        </div>

        {status === 'synced' && adminUrl && (
          <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-700 no-underline hover:bg-emerald-50">
            Open in WooCommerce <ExternalLink size={13} />
          </a>
        )}
        {view.canPush && canPush && (
          <button
            type="button"
            onClick={push}
            disabled={pushing}
            aria-busy={pushing}
            title="Send this order to your store now, without the 30-minute wait"
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${status === 'failed' ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-500'}`}
          >
            {pushing ? <Loader2 size={13} className="animate-spin" /> : status === 'failed' ? <RefreshCw size={13} /> : <UploadCloud size={13} />}
            {pushing ? 'Pushing…' : 'Push to WooCommerce'}
          </button>
        )}
      </div>
      {view.canPush && !canPush && (
        <p className="mb-0 mt-2 text-[11px] text-slate-500">Connect your store in Platforms → WooCommerce to push orders.</p>
      )}
    </section>
  );
}

const BULK_PUSH_MAX = 100;

// Owner-only: pushes the orders on screen now (up to 100), skipping the 30-minute hold.
// Orders already in the store, being sent, cancelled or deleted are left out.
export function WooBulkPushButton({ orderIds = [], onPushed }) {
  const [state, setState] = useState({ status: 'idle', text: '' }); // idle | confirm | pushing | done | error
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const ids = orderIds.filter(Boolean).slice(0, BULK_PUSH_MAX);

  const run = async () => {
    setState({ status: 'pushing', text: '' });
    clearTimeout(timer.current);
    try {
      const response = await apiService.bulkPushWooOrders(ids);
      const count = Number(response?.queued_count) || 0;
      const left = ids.length - count;
      setState({
        status: 'done',
        text: count === 0
          ? 'Nothing to send: these orders are already in WooCommerce, being sent, cancelled or deleted.'
          : `Sending ${count} ${count === 1 ? 'order' : 'orders'} to WooCommerce.${left > 0 ? ` ${left} left out (already sent, cancelled or deleted).` : ''}`,
      });
      onPushed?.();
    } catch (err) {
      setState({ status: 'error', text: err?.status === 429 ? 'Too many bulk pushes. Try again in a minute.' : err?.message || 'Could not push orders.' });
    }
    timer.current = setTimeout(() => setState({ status: 'idle', text: '' }), 8000);
  };

  if (state.status === 'confirm') {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm">
        <span className="text-violet-900">Push {ids.length} {ids.length === 1 ? 'order' : 'orders'} now, without the 30-minute wait?</span>
        <button type="button" onClick={run} className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-violet-500">Push</button>
        <button type="button" onClick={() => setState({ status: 'idle', text: '' })} className="rounded-lg px-2 py-1 text-xs font-bold text-violet-700 hover:bg-violet-100">Cancel</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setState({ status: 'confirm', text: '' })}
        disabled={state.status === 'pushing' || ids.length === 0}
        title="Send the orders on this page to your WooCommerce store now"
        className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.status === 'pushing' ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        {state.status === 'pushing' ? 'Pushing…' : 'Push these orders now'}
      </button>
      {state.text && (
        <span role={state.status === 'error' ? 'alert' : 'status'} className={`text-xs font-semibold ${state.status === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{state.text}</span>
      )}
    </div>
  );
}
