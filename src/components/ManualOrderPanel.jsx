import { useRef, useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { apiService } from '../services/api';
import { formatOrderAmount } from './customerRecordUtils';
import ManualOrderForm from './ManualOrderForm';
import { EMPTY_ORDER_FORM } from './manualOrderUtils';

const ManualOrderPanel = ({ conversationId, contactName = '', onClose, onCreated }) => {
  const [createdOrder, setCreatedOrder] = useState(null);
  const panelRef = useRef(null);

  // The panel is non-modal, so Escape only closes it when focus is inside it;
  // pressing Escape in the chat composer must not throw away a half-filled order.
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && panelRef.current?.contains(e.target)) onClose?.();
  };

  const handleSubmit = async (values, { computedTotal }) => {
    const payload = {
      contact_name: values.contact_name,
      order_items: values.order_items,
      delivery_charge: values.delivery_charge,
      status: values.status,
    };
    if (values.contact_phone) payload.contact_phone = values.contact_phone;
    if (values.contact_email) payload.contact_email = values.contact_email;
    if (values.delivery_address) payload.delivery_address = values.delivery_address;
    if (values.notes) payload.notes = values.notes;
    // Left out, the backend computes the total from items plus delivery charge.
    if (values.total !== undefined) payload.total = values.total;

    try {
      const created = await apiService.createManualOrder(conversationId, payload);
      setCreatedOrder({
        ...(created || {}),
        status: created?.status || values.status,
        total: created?.total ?? values.total ?? computedTotal,
      });
      onCreated?.(created);
    } catch (err) {
      console.error('Manual order create failed:', err);
      throw new Error(err?.message || 'Could not create the order. Please try again.');
    }
  };

  // Rendered beside the chat (no backdrop) so the agent can copy details out of the
  // conversation while filling the form. Inline in the layout on lg+, a drawer below.
  return (
    <aside
      ref={panelRef}
      onKeyDown={handleKeyDown}
      aria-label="Create manual order"
      className="fixed inset-y-0 right-0 z-[9995] flex w-full max-w-[420px] flex-col overflow-hidden border-l border-slate-200 bg-[#f9f9fb] shadow-[0_30px_100px_-15px_rgba(15,23,42,0.45)] animate-fade-in-right lg:static lg:z-auto lg:w-[400px] lg:max-w-none lg:shrink-0 lg:shadow-none xl:w-[420px]"
    >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShoppingCart size={18} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <h2 className="font-['Epilogue'] text-lg font-black tracking-tight text-slate-900">Create manual order</h2>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                Conversation <span className="font-mono">{conversationId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-slate-900 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {createdOrder ? (
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-12 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h3 className="font-['Epilogue'] text-xl font-black tracking-tight text-slate-900">Order recorded</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              It now appears under Orders for this conversation, tagged as a manual entry.
            </p>
            <dl className="mt-6 w-full max-w-sm space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-left">
              {[
                ['Order ID', createdOrder.order_id || '—'],
                ['Status', createdOrder.status.replaceAll('_', ' ')],
                ['Total', formatOrderAmount(createdOrder.total)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</dt>
                  <dd className="truncate text-xs font-bold capitalize text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={onClose}
              className="mt-7 h-11 rounded-xl bg-slate-900 px-8 text-xs font-black text-white transition-colors hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        ) : (
          <ManualOrderForm
            initialForm={{ ...EMPTY_ORDER_FORM, contact_name: contactName || '' }}
            allowTotalOverride
            submitLabel="Create order"
            submittingLabel="Creating…"
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        )}
    </aside>
  );
};

export default ManualOrderPanel;
