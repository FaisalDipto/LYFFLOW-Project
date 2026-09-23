import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { apiService } from '../services/api';
import { formatOrderAmount } from './customerRecordUtils';

// Mirrors OrderStatus in the API schema; `new` is the endpoint's default.
const ORDER_STATUSES = [
  'new', 'pending', 'delivered_approval_pending', 'partial_delivered_approval_pending',
  'cancelled_approval_pending', 'unknown_approval_pending', 'delivered',
  'partial_delivered', 'cancelled', 'hold', 'in_review', 'unknown'
];

// Field limits come straight from ManualOrderCreateRequest so the form rejects
// what the backend would reject anyway, before the round trip.
const LIMITS = {
  contact_name: 200,
  contact_phone: 50,
  contact_email: 254,
  delivery_address: 200,
};

const EMPTY_ITEM = { name: '', quantity: '1', price: '' };

const toAmount = (val) => {
  const num = Number(String(val ?? '').trim());
  return Number.isFinite(num) ? num : 0;
};

const inputClass = (hasError) =>
  `w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-offset-1 ${
    hasError
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
      : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-200'
  }`;

const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400';

const ManualOrderPanel = ({ conversationId, contactName = '', onClose, onCreated }) => {
  const [form, setForm] = useState({
    contact_name: contactName || '',
    contact_phone: '',
    contact_email: '',
    delivery_address: '',
    delivery_charge: '',
    notes: '',
    status: 'new',
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [overrideTotal, setOverrideTotal] = useState(false);
  const [totalInput, setTotalInput] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const panelRef = useRef(null);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // The panel is non-modal, so Escape only closes it when focus is inside it;
  // pressing Escape in the chat composer must not throw away a half-filled order.
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && panelRef.current?.contains(e.target)) onClose?.();
  };

  const itemsSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + toAmount(item.quantity) * toAmount(item.price), 0),
    [items]
  );
  const computedTotal = itemsSubtotal + toAmount(form.delivery_charge);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const setItemField = (index, key, value) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
    setErrors(prev => (prev.items ? { ...prev, items: undefined } : prev));
  };

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index) => setItems(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const validate = () => {
    const next = {};
    const name = form.contact_name.trim();
    if (!name) next.contact_name = 'Customer name is required.';
    else if (name.length > LIMITS.contact_name) next.contact_name = `Keep this under ${LIMITS.contact_name} characters.`;

    if (form.contact_phone.trim().length > LIMITS.contact_phone) next.contact_phone = `Keep this under ${LIMITS.contact_phone} characters.`;

    const email = form.contact_email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.contact_email = 'Enter a valid email address.';
    else if (email.length > LIMITS.contact_email) next.contact_email = `Keep this under ${LIMITS.contact_email} characters.`;

    if (form.delivery_address.trim().length > LIMITS.delivery_address) next.delivery_address = `Keep this under ${LIMITS.delivery_address} characters.`;

    if (form.delivery_charge !== '' && !(Number(form.delivery_charge) >= 0)) next.delivery_charge = 'Enter 0 or more.';

    // Rows are optional overall, but any row the user started must be complete.
    const filledItems = items.filter(item => item.name.trim() || item.price !== '' || item.quantity !== '1');
    const badItem = filledItems.find(item => {
      const qty = Number(item.quantity);
      const price = Number(item.price);
      return !item.name.trim() || !Number.isInteger(qty) || qty < 1 || !(price >= 0) || item.price === '';
    });
    if (badItem) next.items = 'Each item needs a name, a whole quantity of 1 or more, and a price of 0 or more.';

    if (overrideTotal && !(Number(totalInput) >= 0)) next.total = 'Enter 0 or more.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    const orderItems = items
      .filter(item => item.name.trim())
      .map(item => ({
        name: item.name.trim(),
        quantity: Number(item.quantity),
        price: Number(item.price),
      }));

    const payload = {
      contact_name: form.contact_name.trim(),
      order_items: orderItems,
      delivery_charge: toAmount(form.delivery_charge).toFixed(2),
      status: form.status,
    };
    if (form.contact_phone.trim()) payload.contact_phone = form.contact_phone.trim();
    if (form.contact_email.trim()) payload.contact_email = form.contact_email.trim();
    if (form.delivery_address.trim()) payload.delivery_address = form.delivery_address.trim();
    if (form.notes.trim()) payload.notes = form.notes.trim();
    // Left out, the backend computes the total from items plus delivery charge.
    if (overrideTotal) payload.total = Number(totalInput).toFixed(2);

    setIsSubmitting(true);
    try {
      const created = await apiService.createManualOrder(conversationId, payload);
      setCreatedOrder(created || {});
      onCreated?.(created);
    } catch (err) {
      console.error('Manual order create failed:', err);
      setSubmitError(err?.message || 'Could not create the order. Please try again.');
    } finally {
      setIsSubmitting(false);
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
                ['Status', (createdOrder.status || form.status).replaceAll('_', ' ')],
                ['Total', formatOrderAmount(createdOrder.total ?? computedTotal)],
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
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5">
              <section>
                <h3 className="mb-4 border-b border-slate-200/70 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Customer</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="mo-name">Name <span className="text-rose-500">*</span></label>
                    <input
                      id="mo-name"
                      ref={firstFieldRef}
                      value={form.contact_name}
                      onChange={(e) => setField('contact_name', e.target.value)}
                      maxLength={LIMITS.contact_name}
                      placeholder="Customer's full name"
                      className={inputClass(errors.contact_name)}
                    />
                    {errors.contact_name && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.contact_name}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="mo-phone">Phone</label>
                    <input
                      id="mo-phone"
                      value={form.contact_phone}
                      onChange={(e) => setField('contact_phone', e.target.value)}
                      maxLength={LIMITS.contact_phone}
                      placeholder="01XXXXXXXXX"
                      className={inputClass(errors.contact_phone)}
                    />
                    {errors.contact_phone && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.contact_phone}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="mo-email">Email</label>
                    <input
                      id="mo-email"
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setField('contact_email', e.target.value)}
                      maxLength={LIMITS.contact_email}
                      placeholder="customer@example.com"
                      className={inputClass(errors.contact_email)}
                    />
                    {errors.contact_email && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.contact_email}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="mo-address">Delivery address</label>
                    <input
                      id="mo-address"
                      value={form.delivery_address}
                      onChange={(e) => setField('delivery_address', e.target.value)}
                      maxLength={LIMITS.delivery_address}
                      placeholder="House, road, area, city"
                      className={inputClass(errors.delivery_address)}
                    />
                    {errors.delivery_address && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.delivery_address}</p>}
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                  >
                    <Plus size={13} strokeWidth={2.6} /> Add item
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-[minmax(0,1fr)_72px_100px_36px] items-center gap-2">
                      <input
                        value={item.name}
                        onChange={(e) => setItemField(index, 'name', e.target.value)}
                        placeholder={`Item ${index + 1} name`}
                        aria-label={`Item ${index + 1} name`}
                        className={inputClass(false)}
                      />
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => setItemField(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        aria-label={`Item ${index + 1} quantity`}
                        className={inputClass(false)}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => setItemField(index, 'price', e.target.value)}
                        placeholder="Price"
                        aria-label={`Item ${index + 1} unit price`}
                        className={inputClass(false)}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        aria-label={`Remove item ${index + 1}`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                {errors.items && <p className="mt-2 text-[11px] font-bold text-rose-600">{errors.items}</p>}
              </section>

              <section>
                <h3 className="mb-4 border-b border-slate-200/70 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amounts</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="mo-delivery">Delivery charge</label>
                    <input
                      id="mo-delivery"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.delivery_charge}
                      onChange={(e) => setField('delivery_charge', e.target.value)}
                      placeholder="0.00"
                      className={inputClass(errors.delivery_charge)}
                    />
                    {errors.delivery_charge && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.delivery_charge}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="mo-status">Status</label>
                    <select
                      id="mo-status"
                      value={form.status}
                      onChange={(e) => setField('status', e.target.value)}
                      className={`${inputClass(false)} capitalize`}
                    >
                      {ORDER_STATUSES.map(status => (
                        <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Total</p>
                      <p className="mt-0.5 text-lg font-black tracking-tight text-slate-900">
                        {formatOrderAmount(overrideTotal ? toAmount(totalInput) : computedTotal)}
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={overrideTotal}
                        onChange={(e) => {
                          setOverrideTotal(e.target.checked);
                          if (e.target.checked) setTotalInput(computedTotal.toFixed(2));
                          setErrors(prev => ({ ...prev, total: undefined }));
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                      />
                      Set manually
                    </label>
                  </div>
                  {overrideTotal ? (
                    <div className="mt-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={totalInput}
                        onChange={(e) => { setTotalInput(e.target.value); setErrors(prev => ({ ...prev, total: undefined })); }}
                        aria-label="Total amount"
                        className={inputClass(errors.total)}
                      />
                      {errors.total && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.total}</p>}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] font-medium text-slate-400">
                      Items {formatOrderAmount(itemsSubtotal)} + delivery {formatOrderAmount(toAmount(form.delivery_charge))}
                    </p>
                  )}
                </div>
              </section>

              <section>
                <label className={labelClass} htmlFor="mo-notes">Notes</label>
                <textarea
                  id="mo-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="Anything the delivery or support team should know"
                  className={`${inputClass(false)} resize-none leading-6`}
                />
              </section>

              {submitError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
                  <p className="text-xs font-bold leading-5 text-rose-700">{submitError}</p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200/60 bg-white px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-black text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                {isSubmitting ? 'Creating…' : 'Create order'}
              </button>
            </div>
          </form>
        )}
    </aside>
  );
};

export default ManualOrderPanel;
