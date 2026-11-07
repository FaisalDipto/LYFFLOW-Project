import { useEffect, useId, useRef, useState } from 'react';
import { Check, Loader2, Search, Tag, X } from 'lucide-react';
import { apiService } from '../../services/api';
import { useProductSuggestions } from '../../hooks/useProductSuggestions';

const labelErrorText = (error) => {
  if (error?.status === 422) return "This photo is still being processed. Try again shortly.";
  if (error?.status === 404) return "That product or photo wasn't found in this page's catalog.";
  if (error?.status === 403) return "This conversation can't be edited from here.";
  return error?.message || "The label didn't save. Try again.";
};

/**
 * "This is product…" under a customer's photo: staff tell the visual matcher which catalog
 * products the photo shows, so later photos of them match directly. A photo can show
 * several (an item sold as a 1-piece and a 2-piece pack gets both), one call per product.
 * There's no endpoint to read labels back, so the chosen products live in the parent's
 * state while the inbox is open; each chip's × removes just that product's label.
 * @param {{
 *   conversationId: string, attachmentId: string, catalogId?: string,
 *   labels?: { product_id: string, name: string }[],
 *   onLabelsChange: (update: (labels: { product_id: string, name: string }[]) => { product_id: string, name: string }[]) => void,
 * }} props
 */
export default function ImageProductLabel({ conversationId, attachmentId, catalogId = '', labels = [], onLabelsChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(() => new Set());
  const [error, setError] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();
  const suggestions = useProductSuggestions(open ? catalogId : '', open ? query : '');
  const labelledIds = new Set(labels.map(item => item.product_id));
  // Products already on the photo aren't offered again.
  const products = suggestions.products.filter(product => !labelledIds.has(product.product_id));

  // Closes on a click outside or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    inputRef.current?.focus();
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const openPicker = () => {
    setQuery('');
    setHighlight(0);
    setError('');
    setOpen(true);
  };

  const pick = async (product) => {
    if (!product || saving) return;
    setSaving(true);
    setError('');
    try {
      await apiService.labelCustomerImage(conversationId, attachmentId, product.product_id);
      const label = { product_id: product.product_id, name: product.name || product.code || 'Product' };
      onLabelsChange(current => (current.some(item => item.product_id === label.product_id) ? current : [...current, label]));
      setOpen(false);
    } catch (err) {
      console.error(`Visual label failed (${err?.status}):`, err?.body ?? err?.message, { conversationId, attachmentId, productId: product.product_id });
      setError(labelErrorText(err));
      // Not processed yet: another product won't help, so close and show it under the photo.
      if (err?.status === 422) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (label) => {
    if (removing.has(label.product_id)) return;
    setRemoving(current => new Set(current).add(label.product_id));
    setError('');
    const drop = () => onLabelsChange(current => current.filter(item => item.product_id !== label.product_id));
    try {
      await apiService.removeCustomerImageLabel(conversationId, attachmentId, label.product_id);
      drop();
    } catch (err) {
      console.error(`Removing visual label failed (${err?.status}):`, err?.body ?? err?.message, { conversationId, attachmentId, productId: label.product_id });
      // 404: that product isn't labelled on the photo any more, so the chip goes either way.
      if (err?.status === 404) drop();
      else setError(err?.status === 403 ? labelErrorText(err) : (err?.message || "The label wasn't removed. Try again."));
    } finally {
      setRemoving(current => {
        const next = new Set(current);
        next.delete(label.product_id);
        return next;
      });
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
    if (!products.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setHighlight(index => (index + 1) % products.length); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setHighlight(index => (index - 1 + products.length) % products.length); }
    if (event.key === 'Enter') { event.preventDefault(); pick(products[highlight]); }
  };

  return (
    <div ref={rootRef} className="image-product-label relative mt-1.5 max-w-[260px] text-[11px]">
      <div className="flex flex-wrap items-center gap-1">
        {labels.map(label => (
          <span key={label.product_id} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-emerald-50 py-0.5 pl-2 pr-0.5 font-semibold text-emerald-700" title="You labelled this photo with this product">
            <Check size={12} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{label.name}</span>
            <button
              type="button"
              onClick={() => remove(label)}
              disabled={removing.has(label.product_id)}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800 disabled:opacity-60"
              aria-label={`Remove ${label.name}`}
            >
              {removing.has(label.product_id) ? <Loader2 size={10} className="animate-spin" /> : <X size={11} />}
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openPicker())}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-full border border-solid border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
          title={labels.length ? 'Add another product this photo shows' : 'Tell the AI which product this photo shows'}
        >
          <Tag size={12} aria-hidden="true" /> {labels.length ? 'Add product…' : 'This is product…'}
        </button>
      </div>

      {error && !open && (
        <p role="alert" className="mb-0 mt-1.5 rounded-lg border border-solid border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-800">{error}</p>
      )}

      {open && (
        <div className="image-product-label-picker absolute left-0 top-full z-30 mt-1 w-72 max-w-[80vw] rounded-xl border border-solid border-slate-200 bg-white p-2 shadow-lg">
          <div className="flex items-center gap-1.5 rounded-lg border border-solid border-slate-200 px-2 focus-within:border-emerald-500">
            <Search size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setHighlight(0); }}
              onKeyDown={onKeyDown}
              placeholder="Product name or code"
              aria-label="Search products"
              role="combobox"
              aria-expanded={products.length > 0}
              aria-controls={listId}
              aria-activedescendant={products.length ? `${listId}-${highlight}` : undefined}
              className="h-8 min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-slate-800 shadow-none outline-none focus:shadow-none focus:outline-none focus:ring-0"
            />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-700">
              <X size={13} />
            </button>
          </div>

          {saving ? (
            <p className="m-0 flex items-center gap-2 px-1 py-3 text-xs text-slate-500"><Loader2 size={13} className="animate-spin" aria-hidden="true" /> Saving…</p>
          ) : suggestions.status === 'idle' ? (
            <p className="m-0 px-1 py-3 text-xs text-slate-500">Search your catalog for the product in this photo.</p>
          ) : suggestions.status === 'loading' ? (
            <p className="m-0 flex items-center gap-2 px-1 py-3 text-xs text-slate-400"><Loader2 size={13} className="animate-spin" aria-hidden="true" /> Searching…</p>
          ) : suggestions.status === 'error' ? (
            <p className="m-0 px-1 py-3 text-xs font-semibold text-rose-600">Couldn't load products.</p>
          ) : products.length === 0 ? (
            <p className="m-0 px-1 py-3 text-xs text-slate-500">No matching products.</p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Products" className="m-0 mt-1 max-h-56 list-none overflow-y-auto p-0">
              {products.map((product, index) => (
                <li
                  key={product.product_id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={highlight === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(product)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${highlight === index ? 'is-active bg-slate-100' : ''}`}
                >
                  <span className="min-w-0 truncate text-xs font-semibold text-slate-900">{product.name}</span>
                  {product.code && <span className="shrink-0 font-mono text-[10px] text-slate-500">{product.code}</span>}
                </li>
              ))}
            </ul>
          )}
          {error && <p role="alert" className="mb-0 mt-1 px-1 text-xs font-semibold text-rose-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
