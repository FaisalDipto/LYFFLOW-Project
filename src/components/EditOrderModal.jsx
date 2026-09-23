import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, X } from 'lucide-react';
import { apiService } from '../services/api';
import ManualOrderForm from './ManualOrderForm';
import { normalizeOrderValues, orderToFormState } from './manualOrderUtils';

// List rows only carry a summary; the detail response is what has order_items.
const hasFullDetail = (order) => Array.isArray(order?.order_items);

const EditOrderModal = ({ orderId, order: initialOrder, onClose, onSaved }) => {
  const [order, setOrder] = useState(hasFullDetail(initialOrder) ? initialOrder : null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (order) return undefined;
    let cancelled = false;
    apiService.getCustomerOrder(orderId)
      .then((response) => {
        const data = response?.data || response;
        if (!cancelled) setOrder(data?.order || data);
      })
      .catch((error) => {
        console.error('Failed to load order for editing:', error);
        if (!cancelled) setLoadError(error?.message || 'Could not load this order.');
      });
    return () => { cancelled = true; };
  }, [order, orderId]);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const initialState = useMemo(() => (order ? orderToFormState(order) : null), [order]);

  // The endpoint applies only the fields it receives, so send just what changed.
  // Cleared optional text goes out as '' so the backend actually clears it.
  const handleSubmit = async (values) => {
    const before = normalizeOrderValues(initialState.form, initialState.items);
    const payload = {};
    ['contact_name', 'contact_phone', 'contact_email', 'delivery_address', 'notes', 'status', 'delivery_charge'].forEach((key) => {
      if (values[key] !== before[key]) payload[key] = values[key];
    });
    if (payload.delivery_charge !== undefined) payload.delivery_charge = Number(payload.delivery_charge);
    if (JSON.stringify(values.order_items) !== JSON.stringify(before.order_items)) {
      payload.order_items = values.order_items;
    }

    if (Object.keys(payload).length === 0) {
      onClose?.();
      return;
    }

    try {
      const response = await apiService.updateCustomerOrder(orderId, payload);
      const data = response?.data || response;
      onSaved?.(data?.order || data);
    } catch (err) {
      console.error('Order update failed:', err);
      throw new Error(err?.message || 'Could not save the changes. Please try again.');
    }
  };

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Edit order"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-[#f9f9fb] shadow-2xl animate-scale-in"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Pencil size={17} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <h2 className="font-['Epilogue'] text-lg font-black tracking-tight text-slate-900">Edit order</h2>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                <span className="font-mono">{order?.order_id || initialOrder?.order_id || orderId}</span>
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

        {initialState ? (
          <ManualOrderForm
            initialForm={initialState.form}
            initialItems={initialState.items}
            submitLabel="Save changes"
            submittingLabel="Saving…"
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        ) : loadError ? (
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{loadError}</p>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Loader2 className="animate-spin" size={28} />
            <p className="text-sm">Loading order...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditOrderModal;
