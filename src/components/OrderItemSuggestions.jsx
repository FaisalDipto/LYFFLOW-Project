import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import ProductPrice from './products/ProductPrice';
import { normalizeStockStatus, stockLabel, variantTitle } from '../utils/productPricing';

const stockTone = (status) => {
  const normalized = normalizeStockStatus(status);
  if (normalized === 'out_of_stock') return 'text-red-600';
  if (normalized === 'on_backorder') return 'text-amber-600';
  return 'text-emerald-700';
};

const StockText = ({ status, quantity }) => (
  <span className={`shrink-0 font-semibold ${stockTone(status)}`}>
    {stockLabel(status)}{quantity !== null && quantity !== undefined ? ` · ${quantity}` : ''}
  </span>
);

/**
 * The catalog dropdown under an order item row. Two modes: matching products, or the
 * variants of a variable product the user picked. Options keep focus in the input
 * (mousedown is cancelled) so the arrow keys and Enter keep working.
 */
const OrderItemSuggestions = ({
  id, mode, status, entries, product, highlight, onHighlight, onPick, onBack,
}) => {
  const { business } = useBusiness();
  const currency = business?.currency || 'BDT';
  const optionId = (index) => `${id}-option-${index}`;

  let body;
  if (status === 'loading') {
    body = (
      <p className="flex items-center gap-2 px-3 py-3 text-xs font-medium text-slate-400">
        <Loader2 size={13} className="animate-spin" /> {mode === 'variants' ? 'Loading options…' : 'Searching catalog…'}
      </p>
    );
  } else if (status === 'error') {
    body = <p className="px-3 py-3 text-xs font-semibold text-rose-600">Could not load {mode === 'variants' ? 'options' : 'products'}.</p>;
  } else if (entries.length === 0) {
    body = (
      <p className="px-3 py-3 text-xs font-medium text-slate-400">
        {mode === 'variants' ? 'This product has no options.' : 'No matching products. Keep typing to add it by hand.'}
      </p>
    );
  } else {
    body = (
      <ul role="listbox" id={id} aria-label={mode === 'variants' ? `Options of ${product?.name}` : 'Matching products'} className="max-h-64 overflow-y-auto py-1">
        {entries.map((entry, index) => {
          const isVariant = mode === 'variants';
          const title = isVariant ? (entry.title || variantTitle(entry.option_values)) : entry.name;
          const code = isVariant ? (entry.sku || product?.code) : entry.code;
          const regular = isVariant ? (entry.regular_price ?? product?.regular_price) : entry.regular_price;
          const sale = isVariant
            ? (entry.regular_price == null && entry.sale_price == null ? product?.sale_price : entry.sale_price)
            : entry.sale_price;
          const isVariable = !isVariant && entry.product_type === 'variable';
          return (
            <li
              key={isVariant ? entry.variant_id : entry.product_id}
              id={optionId(index)}
              role="option"
              aria-selected={highlight === index}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => onHighlight(index)}
              onClick={() => onPick(entry)}
              className={`order-item-suggestion flex cursor-pointer items-center gap-3 px-3 py-2 ${highlight === index ? 'is-active bg-emerald-50' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900">{title}</p>
                <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px]">
                  {code && <span className="truncate font-mono text-slate-500">{code}</span>}
                  <StockText status={entry.stock_status} quantity={entry.stock_quantity} />
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <ProductPrice regularPrice={regular} salePrice={sale} currency={entry.currency || product?.currency || currency} size="sm" />
                {isVariable && (
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-700">
                    Options <ChevronRight size={13} />
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div
      className="order-item-suggestions absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)]"
      onMouseDown={(e) => e.preventDefault()}
    >
      {mode === 'variants' && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center gap-1 border-b border-solid border-slate-100 bg-slate-50 px-3 py-2 text-left text-[11px] font-bold text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft size={13} /> {product?.name} · choose an option
        </button>
      )}
      {body}
      {mode === 'products' && status === 'ready' && entries.length > 0 && (
        <p className="border-t border-slate-100 px-3 py-1.5 text-[10px] font-medium text-slate-400">↑↓ to move · Enter to fill · Esc to close</p>
      )}
    </div>
  );
};

export default OrderItemSuggestions;
