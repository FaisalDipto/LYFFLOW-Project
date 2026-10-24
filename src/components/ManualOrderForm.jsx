import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';
import { useProductSuggestions } from '../hooks/useProductSuggestions';
import { currentPrice, normalizeStockStatus, stockLabel, variantTitle } from '../utils/productPricing';
import { useBusiness } from '../context/BusinessContext';
import { formatOrderAmount } from './customerRecordUtils';
import { EMPTY_ITEM, EMPTY_ORDER_FORM, LIMITS, ORDER_STATUSES, normalizeOrderValues, toAmount } from './manualOrderUtils';
import OrderItemSuggestions from './OrderItemSuggestions';

const inputClass = (hasError) =>
  `w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-offset-1 ${
    hasError
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
      : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-200'
  }`;

const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400';

/**
 * Order fields shared by manual create and edit. `onSubmit(values, { computedTotal })`
 * receives normalizeOrderValues() output (plus `total` when overridden) and may throw
 * to surface an error under the form. Item names and codes autocomplete from the
 * product catalog `catalogId` (the business's first catalog when not given).
 */
const ManualOrderForm = ({
  initialForm = EMPTY_ORDER_FORM,
  initialItems,
  catalogId = '',
  allowTotalOverride = false,
  submitLabel = 'Save',
  submittingLabel = 'Saving…',
  onSubmit,
  onCancel,
}) => {
  const { business } = useBusiness();
  const currency = business?.currency || 'BDT';
  const [form, setForm] = useState(() => ({ ...EMPTY_ORDER_FORM, ...initialForm }));
  const [items, setItems] = useState(() => (initialItems?.length ? initialItems : [{ ...EMPTY_ITEM }]));
  const [overrideTotal, setOverrideTotal] = useState(false);
  const [totalInput, setTotalInput] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

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
    // Typing over a name or code means it may no longer be the catalog item picked.
    const unlinks = key === 'name' || key === 'code';
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, [key]: value, ...(unlinks ? { stock: undefined } : {}) } : item)));
    setErrors(prev => (prev.items ? { ...prev, items: undefined } : prev));
  };

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index) => {
    closeSuggestions();
    setItems(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  // Catalog autocomplete for the row being typed in: `suggest` is that row and field;
  // `variantPick` is set while choosing an option of a variable product.
  const [suggest, setSuggest] = useState(null);
  const [variantPick, setVariantPick] = useState(null);
  const [highlight, setHighlight] = useState(0);
  const suggestQuery = suggest && !variantPick ? (items[suggest.index]?.[suggest.field] || '') : '';
  const suggestions = useProductSuggestions(catalogId, suggestQuery);
  const suggestionEntries = variantPick ? variantPick.variants : suggestions.products;
  const suggestionStatus = variantPick ? variantPick.status : suggestions.status;
  const openRow = suggest && (variantPick || suggestions.status !== 'idle') ? suggest.index : null;

  function closeSuggestions() {
    setSuggest(null);
    setVariantPick(null);
    setHighlight(0);
  }

  const fillItem = (index, { name, code, price, stock }) => {
    setItems(prev => prev.map((item, i) => (i === index ? {
      ...item,
      name: (name || '').slice(0, LIMITS.item_name),
      code: (code || '').slice(0, LIMITS.item_code),
      price: price === null || price === undefined ? item.price : String(price),
      stock,
    } : item)));
    setErrors(prev => (prev.items ? { ...prev, items: undefined } : prev));
    closeSuggestions();
  };

  const fillFromProduct = (index, product) => fillItem(index, {
    name: product.name,
    code: product.code,
    price: currentPrice(product.regular_price, product.sale_price),
    stock: { status: product.stock_status, quantity: product.stock_quantity },
  });

  const pickSuggestion = (entry) => {
    if (!suggest) return;
    const { index } = suggest;
    if (variantPick) {
      const { product } = variantPick;
      const inheritsPrice = entry.regular_price == null && entry.sale_price == null;
      fillItem(index, {
        name: `${product.name} – ${entry.title || variantTitle(entry.option_values)}`,
        code: entry.sku || product.code,
        price: currentPrice(entry.regular_price ?? product.regular_price, inheritsPrice ? product.sale_price : entry.sale_price),
        stock: { status: entry.stock_status, quantity: entry.stock_quantity },
      });
      return;
    }
    if (entry.product_type !== 'variable') {
      fillFromProduct(index, entry);
      return;
    }
    // A variable product is ordered as one of its variants; list them to choose from.
    setHighlight(0);
    setVariantPick({ product: entry, status: 'loading', variants: [] });
    apiService.getProductVariants(suggestions.catalogId, entry.product_id)
      .then(variants => {
        const active = (Array.isArray(variants) ? variants : []).filter(variant => variant.is_active !== false);
        // No options after all: the product itself is what gets ordered.
        if (active.length === 0) { fillFromProduct(index, entry); return; }
        setVariantPick(prev => (prev?.product.product_id === entry.product_id ? { ...prev, status: 'ready', variants: active } : prev));
      })
      .catch(error => {
        console.error('Failed to load product options:', error);
        setVariantPick(prev => (prev?.product.product_id === entry.product_id ? { ...prev, status: 'error' } : prev));
      });
  };

  const itemFieldProps = (index, field) => ({
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': openRow === index,
    'aria-controls': openRow === index ? `mo-item-${index}-suggestions` : undefined,
    'aria-activedescendant': openRow === index && suggestionEntries[highlight] ? `mo-item-${index}-suggestions-option-${highlight}` : undefined,
    autoComplete: 'off',
    onFocus: () => {
      if (suggest?.index !== index || suggest?.field !== field) {
        setVariantPick(null);
        setHighlight(0);
      }
      setSuggest({ index, field });
    },
    onBlur: closeSuggestions,
    onKeyDown: (e) => {
      if (openRow !== index) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight(h => Math.min(h + 1, Math.max(suggestionEntries.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight(h => Math.max(h - 1, 0));
      } else if (e.key === 'Enter' && suggestionEntries[highlight]) {
        // Fill the row instead of submitting the form.
        e.preventDefault();
        pickSuggestion(suggestionEntries[highlight]);
      } else if (e.key === 'Escape') {
        // Handled here so the surrounding panel doesn't close too.
        e.preventDefault();
        e.stopPropagation();
        if (variantPick) { setVariantPick(null); setHighlight(0); } else closeSuggestions();
      }
    },
  });

  const changeItemText = (index, field, value) => {
    setItemField(index, field, value);
    setVariantPick(null);
    setHighlight(0);
    setSuggest({ index, field });
  };

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
    const filledItems = items.filter(item => item.name.trim() || (item.code || '').trim() || item.price !== '' || item.quantity !== '1');
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

    const values = normalizeOrderValues(form, items);
    if (allowTotalOverride && overrideTotal) values.total = Number(totalInput).toFixed(2);

    setIsSubmitting(true);
    try {
      await onSubmit(values, { computedTotal });
    } catch (err) {
      setSubmitError(err?.message || 'Could not save the order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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

          <p className="-mt-2 mb-3 text-[11px] font-medium text-slate-400">Type a product name or code to fill it in from your catalog.</p>
          <div className="space-y-3">
            {items.map((item, index) => {
              const stockStatus = item.stock ? normalizeStockStatus(item.stock.status) : null;
              const stockQuantity = item.stock?.quantity;
              const overStock = stockQuantity !== null && stockQuantity !== undefined && Number(item.quantity) > stockQuantity;
              return (
              <div key={index} className="relative">
              <div className="grid grid-cols-[minmax(0,1fr)_72px_100px_36px] items-center gap-x-2 gap-y-1.5">
                <input
                  value={item.name}
                  onChange={(e) => changeItemText(index, 'name', e.target.value)}
                  {...itemFieldProps(index, 'name')}
                  maxLength={LIMITS.item_name}
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
                <input
                  value={item.code || ''}
                  onChange={(e) => changeItemText(index, 'code', e.target.value)}
                  {...itemFieldProps(index, 'code')}
                  maxLength={LIMITS.item_code}
                  placeholder="Product code / SKU (optional)"
                  aria-label={`Item ${index + 1} product code`}
                  spellCheck={false}
                  className="col-span-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-medium text-slate-700 outline-none transition-colors placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 focus:ring-offset-1"
                />
                {item.stock && (
                  <p className="col-span-3 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold">
                    <span className="text-slate-400">From catalog ·</span>
                    <span className={stockStatus === 'out_of_stock' ? 'text-red-600' : stockStatus === 'on_backorder' ? 'text-amber-600' : 'text-emerald-700'}>
                      {stockLabel(item.stock.status)}{stockQuantity !== null && stockQuantity !== undefined ? ` · ${stockQuantity} available` : ''}
                    </span>
                    {overStock && stockStatus !== 'out_of_stock' && <span className="text-amber-600">More than in stock</span>}
                  </p>
                )}
              </div>
              {openRow === index && (
                <OrderItemSuggestions
                  id={`mo-item-${index}-suggestions`}
                  mode={variantPick ? 'variants' : 'products'}
                  status={suggestionStatus}
                  entries={suggestionEntries}
                  product={variantPick?.product}
                  highlight={highlight}
                  onHighlight={setHighlight}
                  onPick={pickSuggestion}
                  onBack={() => { setVariantPick(null); setHighlight(0); }}
                />
              )}
              </div>
              );
            })}
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
                  {formatOrderAmount(overrideTotal ? toAmount(totalInput) : computedTotal, currency)}
                </p>
              </div>
              {allowTotalOverride && (
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
              )}
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
                Items {formatOrderAmount(itemsSubtotal, currency)} + delivery {formatOrderAmount(toAmount(form.delivery_charge), currency)}
                {!allowTotalOverride && ' · recalculated on save'}
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
          onClick={onCancel}
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
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ManualOrderForm;
