import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { formatOrderAmount, recordStatusClass } from './customerRecordUtils';

const COLLAPSED_COUNT = 3;

const summarizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return 'No items';
  const [first, ...rest] = items;
  const head = `${first.name}${first.quantity > 1 ? ` ×${first.quantity}` : ''}`;
  return rest.length ? `${head} +${rest.length} more` : head;
};

const formatOrderDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

// Orders placed in one conversation, for the chat's profile sidebar. Reloads when the
// conversation changes or refreshKey is bumped (after a manual order is created).
const ConversationOrders = ({ conversationId, refreshKey = 0, onOpenOrder }) => {
  // The last response, tagged with the request it answers; anything else is still loading.
  const [result, setResult] = useState(null);
  // Expansion belongs to one conversation, so switching starts collapsed again.
  const [expandedFor, setExpandedFor] = useState(null);
  const requestKey = `${conversationId}:${refreshKey}`;

  useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;
    apiService.getConversationOrders(conversationId)
      .then(response => {
        if (cancelled) return;
        setResult({ key: requestKey, conversationId, orders: Array.isArray(response) ? response : [], error: '' });
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Failed to load conversation orders:', error);
        const message = error?.status === 403
          ? 'This conversation is not in the active business.'
          : error?.status === 404
            ? 'Conversation not found.'
            : 'Could not load orders.';
        setResult({ key: requestKey, conversationId, orders: [], error: message });
      });
    return () => { cancelled = true; };
  }, [conversationId, requestKey]);

  // While a refresh of the same conversation loads, keep showing its current list.
  const current = result?.conversationId === conversationId ? result : null;
  const status = !current || (current.key !== requestKey && current.orders.length === 0)
    ? 'loading'
    : current.error ? 'error' : 'ready';
  const orders = current?.orders || [];
  const error = current?.error || '';
  const isExpanded = expandedFor === conversationId;
  const setIsExpanded = (update) => setExpandedFor(update(isExpanded) ? conversationId : null);
  const visibleOrders = isExpanded ? orders : orders.slice(0, COLLAPSED_COUNT);
  const hiddenCount = orders.length - visibleOrders.length;

  return (
    <section aria-labelledby="conversation-orders-heading">
      <h4
        id="conversation-orders-heading"
        className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"
      >
        Orders
        {status === 'ready' && orders.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] tracking-normal text-slate-500">{orders.length}</span>
        )}
      </h4>

      {status === 'loading' && orders.length === 0 ? (
        <div className="space-y-2" aria-label="Loading orders">
          {[0, 1].map(key => <div key={key} className="h-[62px] animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : status === 'error' ? (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600">{error}</p>
      ) : orders.length === 0 ? (
        <p className="text-xs font-medium text-slate-400">No orders in this conversation yet.</p>
      ) : (
        <ul className="space-y-2">
          {visibleOrders.map(order => {
            const content = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs font-bold text-slate-900">{order.order_id || 'Order'}</span>
                  <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold capitalize ${recordStatusClass(order.status)}`}>
                    {String(order.status || 'unknown').replaceAll('_', ' ')}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] font-medium text-slate-500" title={summarizeItems(order.order_items)}>
                  {summarizeItems(order.order_items)}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-medium text-slate-400">
                    {formatOrderDate(order.created_at)}
                    {order.created_by === 'manual' ? ' · Manual' : ''}
                  </span>
                  <span className="font-bold text-slate-900">{formatOrderAmount(order.total)}</span>
                </div>
              </>
            );
            return (
              <li key={order.customer_order_id || order.order_id}>
                {onOpenOrder ? (
                  <button
                    type="button"
                    onClick={() => onOpenOrder(order)}
                    title="Open in Orders"
                    className="block w-full rounded-xl border border-solid border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                  >
                    {content}
                  </button>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {(hiddenCount > 0 || (isExpanded && orders.length > COLLAPSED_COUNT)) && (
        <button
          type="button"
          onClick={() => setIsExpanded(open => !open)}
          className="mt-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
        >
          {isExpanded ? 'Show fewer' : `Show ${hiddenCount} more`}
        </button>
      )}
    </section>
  );
};

export default ConversationOrders;
