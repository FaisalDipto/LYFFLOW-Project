import { useRef, useState } from 'react';
import { Bot, ChevronDown, ExternalLink, MapPin, Phone, Plus, ReceiptText, X } from 'lucide-react';
import {
  formatOrderAmount, formatOrderDate, parseOrderAmount, recordStatusClass, summarizeOrderItems,
} from './customerRecordUtils';

const statusLabel = (status) => String(status || 'unknown').replaceAll('_', ' ');

// A conversation's full order history beside the chat: totals, a status filter, and
// each order's items, delivery and contact details. `ordersState` comes from
// useConversationOrders (newest first, up to 50), so filtering happens here.
const ConversationOrdersPanel = ({ ordersState, onOpenOrder, onCreateOrder, onClose }) => {
  const { status, orders, error } = ordersState;
  const panelRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const statusCounts = orders.reduce((counts, order) => {
    const key = order.status || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  // A filter whose status vanished (say, after a reload) falls back to All.
  const activeFilter = statusFilter !== 'all' && !statusCounts[statusFilter] ? 'all' : statusFilter;
  const visibleOrders = activeFilter === 'all' ? orders : orders.filter(order => (order.status || 'unknown') === activeFilter);
  // Cancelled orders don't count towards what the customer has spent.
  const spent = orders
    .filter(order => !String(order.status || '').startsWith('cancelled'))
    .reduce((sum, order) => sum + (parseOrderAmount(order.total) || 0), 0);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && panelRef.current?.contains(e.target)) onClose?.();
  };

  return (
    <aside
      ref={panelRef}
      onKeyDown={handleKeyDown}
      aria-label="Order history"
      className="conversation-orders-panel fixed inset-y-0 right-0 z-[9995] flex w-full max-w-[420px] flex-col overflow-hidden border-l border-slate-200 bg-[#f9f9fb] shadow-[0_30px_100px_-15px_rgba(15,23,42,0.45)] animate-fade-in-right lg:static lg:z-auto lg:w-[380px] lg:max-w-none lg:shrink-0 lg:shadow-none xl:w-[400px]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 bg-white px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ReceiptText size={18} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <h2 className="font-['Epilogue'] text-lg font-black tracking-tight text-slate-900">Order history</h2>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">Orders placed in this conversation</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close order history"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-slate-900 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {status === 'ready' && orders.length > 0 && (
        <div className="shrink-0 space-y-3 border-b border-slate-200/60 bg-white px-5 py-3.5">
          <dl className="grid grid-cols-3 gap-2">
            {[
              ['Orders', orders.length],
              ['Spent', formatOrderAmount(spent)],
              ['Last order', formatOrderDate(orders[0]?.created_at) || '—'],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2">
                <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</dt>
                <dd className="mt-0.5 truncate text-xs font-bold text-slate-900" title={String(value)}>{value}</dd>
              </div>
            ))}
          </dl>
          {Object.keys(statusCounts).length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {[['all', orders.length], ...Object.entries(statusCounts)].map(([key, count]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={activeFilter === key}
                  onClick={() => setStatusFilter(key)}
                  className={`h-7 rounded-md border border-solid px-2.5 text-[11px] font-bold capitalize transition-colors ${
                    activeFilter === key
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {key === 'all' ? 'All' : statusLabel(key)} <span className="opacity-60">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {status === 'loading' ? (
          <div className="space-y-2" aria-label="Loading orders">
            {[0, 1, 2].map(key => <div key={key} className="h-[74px] animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : status === 'error' ? (
          <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600">{error}</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-300">
              <ReceiptText size={22} />
            </span>
            <p className="text-sm font-bold text-slate-600">No orders yet</p>
            <p className="mt-1 text-xs text-slate-400">Orders the AI takes or you record here will show up in this list.</p>
            {onCreateOrder && (
              <button
                type="button"
                onClick={onCreateOrder}
                className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg border border-solid border-slate-900 bg-slate-900 px-3.5 text-xs font-bold text-white transition-colors hover:border-emerald-600 hover:bg-emerald-600"
              >
                <Plus size={14} /> Create manual order
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {visibleOrders.map(order => {
              const id = order.customer_order_id || order.order_id;
              const isOpen = expandedId === id;
              const items = Array.isArray(order.order_items) ? order.order_items : [];
              const itemsTotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (parseOrderAmount(item.price) || 0), 0);
              const delivery = parseOrderAmount(order.delivery_charge);
              return (
                <li key={id} className={`overflow-hidden rounded-xl border bg-white transition-colors ${isOpen ? 'border-emerald-200' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(open => (open === id ? null : id))}
                    aria-expanded={isOpen}
                    className="side-panel-row block w-full bg-transparent px-3.5 py-3 text-left hover:bg-slate-50/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs font-bold text-slate-900">{order.order_id || 'Order'}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold capitalize ${recordStatusClass(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                        <span className="text-sm font-black text-slate-900">{formatOrderAmount(order.total)}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex min-w-0 items-center gap-1.5 font-medium text-slate-400">
                        <span className="shrink-0">{formatOrderDate(order.created_at, { withTime: true })}</span>
                        <span aria-hidden="true">·</span>
                        {String(order.created_by).toLowerCase() === 'ai'
                          ? <span className="inline-flex shrink-0 items-center gap-0.5 font-bold text-purple-600"><Bot size={11} /> AI</span>
                          : <span className="shrink-0 capitalize">{order.created_by || 'Manual'}</span>}
                      </span>
                      <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {!isOpen && <p className="mt-1 truncate text-[11px] font-medium text-slate-500">{summarizeOrderItems(items)}</p>}
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t border-slate-100 px-3.5 pb-3.5 pt-3">
                      <table className="w-full text-xs">
                        <caption className="sr-only">Items in {order.order_id}</caption>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item, index) => (
                            <tr key={`${item.name}-${index}`}>
                              <td className="py-1.5 pr-2 align-top">
                                <span className="font-semibold text-slate-800">{item.name}</span>
                                {item.code && <span className="block font-mono text-[10px] text-slate-400">{item.code}</span>}
                              </td>
                              <td className="whitespace-nowrap py-1.5 pr-2 text-right align-top text-slate-500">
                                {item.quantity} × {formatOrderAmount(item.price)}
                              </td>
                              <td className="whitespace-nowrap py-1.5 text-right align-top font-semibold text-slate-800">
                                {formatOrderAmount((Number(item.quantity) || 0) * (parseOrderAmount(item.price) || 0))}
                              </td>
                            </tr>
                          ))}
                          {items.length === 0 && (
                            <tr><td colSpan={3} className="py-1.5 text-slate-400">No items recorded.</td></tr>
                          )}
                        </tbody>
                        <tfoot className="border-t border-slate-200 text-slate-500">
                          {items.length > 0 && delivery !== null && (
                            <>
                              <tr>
                                <td colSpan={2} className="pt-2 text-right">Items</td>
                                <td className="whitespace-nowrap pt-2 text-right">{formatOrderAmount(itemsTotal)}</td>
                              </tr>
                              <tr>
                                <td colSpan={2} className="pt-0.5 text-right">Delivery</td>
                                <td className="whitespace-nowrap pt-0.5 text-right">{formatOrderAmount(delivery)}</td>
                              </tr>
                            </>
                          )}
                          <tr>
                            <td colSpan={2} className="pt-1 text-right font-bold text-slate-900">Total</td>
                            <td className="whitespace-nowrap pt-1 text-right font-black text-slate-900">{formatOrderAmount(order.total)}</td>
                          </tr>
                        </tfoot>
                      </table>

                      {(order.contact_phone || order.delivery_address) && (
                        <div className="space-y-1 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                          {order.contact_phone && <p className="flex items-center gap-1.5"><Phone size={12} className="shrink-0 text-slate-400" />{order.contact_phone}</p>}
                          {order.delivery_address && <p className="flex items-start gap-1.5"><MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />{order.delivery_address}</p>}
                        </div>
                      )}
                      {order.notes && <p className="text-[11px] italic leading-5 text-slate-500">“{order.notes}”</p>}

                      {onOpenOrder && (
                        <button
                          type="button"
                          onClick={() => onOpenOrder(order)}
                          className="inline-flex items-center gap-1 bg-transparent p-0 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                        >
                          Open in Orders <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default ConversationOrdersPanel;
