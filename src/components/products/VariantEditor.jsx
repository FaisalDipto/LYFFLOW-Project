import { Plus, Trash2, Wand2 } from 'lucide-react';
import { STOCK_STATUSES, newRowKey, optionCombinations, parseOptionValues, suggestSku, variantTitle } from '../../utils/productPricing';

const inputClass = 'w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-medium text-slate-700 outline-none transition focus:ring-2 focus:ring-emerald-500';
const labelClass = 'text-xs font-bold tracking-[0.1em] text-slate-500 uppercase';

const sameOptionValues = (a = {}, b = {}) => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
};

// Options (Color: Red, Blue) and the variants built from them, for variable products.
//   options:  [{ key, name, valuesText }]        valuesText is the comma list as typed
//   variants: [{ key, variant_id?, sku, title, option_values, regular_price,
//               sale_price, stock_quantity, stock_status }]
// Prices and quantities stay strings while editing; the form converts them on save.
export default function VariantEditor({ options, variants, onOptionsChange, onVariantsChange, productCode, defaultPrice, currency }) {
  const parsedOptions = options.map(option => ({ name: option.name.trim(), values: parseOptionValues(option.valuesText) }));

  const updateOption = (key, patch) => onOptionsChange(options.map(option => (option.key === key ? { ...option, ...patch } : option)));
  const updateVariant = (key, patch) => onVariantsChange(variants.map(variant => (variant.key === key ? { ...variant, ...patch } : variant)));

  // One variant per option combination. Existing rows with the same option values are
  // kept as they are (prices, stock, saved id), so regenerating never loses edits.
  const generate = () => {
    const combos = optionCombinations(parsedOptions);
    onVariantsChange(combos.map(optionValues => {
      const existing = variants.find(variant => sameOptionValues(variant.option_values, optionValues));
      return existing || {
        key: newRowKey(),
        sku: suggestSku(productCode, optionValues),
        title: variantTitle(optionValues, parsedOptions),
        option_values: optionValues,
        regular_price: defaultPrice || '',
        sale_price: '',
        stock_quantity: '',
        stock_status: 'in_stock',
      };
    }));
  };

  const addVariant = () => onVariantsChange([...variants, {
    key: newRowKey(), sku: '', title: '', option_values: {}, regular_price: defaultPrice || '', sale_price: '', stock_quantity: '', stock_status: 'in_stock',
  }]);

  const combinationCount = optionCombinations(parsedOptions).length;

  return (
    <div className="variant-editor space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className={labelClass}>Options</span>
          <button type="button" onClick={() => onOptionsChange([...options, { key: newRowKey(), name: '', valuesText: '' }])} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
            <Plus size={14} /> Add option
          </button>
        </div>
        {options.length === 0 && <p className="m-0 text-xs text-slate-500">Add the ways this product varies, like Size or Color.</p>}
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={option.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-center gap-2">
              <input aria-label={`Option ${index + 1} name`} value={option.name} onChange={e => updateOption(option.key, { name: e.target.value })} placeholder="e.g. Size" className={inputClass} />
              <input aria-label={`Option ${index + 1} values`} value={option.valuesText} onChange={e => updateOption(option.key, { valuesText: e.target.value })} placeholder="Comma separated, e.g. S, M, L" className={inputClass} />
              <button type="button" onClick={() => onOptionsChange(options.filter(item => item.key !== option.key))} aria-label={`Remove option ${option.name || index + 1}`} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className={labelClass}>Variants ({variants.length})</span>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={generate} disabled={combinationCount === 0} title={combinationCount ? `Create one variant for each of the ${combinationCount} combinations` : 'Add options with values first'} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50">
              <Wand2 size={14} /> Generate from options{combinationCount ? ` (${combinationCount})` : ''}
            </button>
            <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
              <Plus size={14} /> Add variant
            </button>
          </div>
        </div>
        {variants.length === 0 ? (
          <p className="m-0 text-xs text-slate-500">No variants yet. Generate them from the options, or add one by hand.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] table-fixed border-collapse text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="w-[22%] pb-1.5 pr-2 font-bold">Variant</th>
                  <th scope="col" className="w-[22%] pb-1.5 pr-2 font-bold">SKU *</th>
                  <th scope="col" className="w-[14%] pb-1.5 pr-2 font-bold">Price ({currency}) *</th>
                  <th scope="col" className="w-[13%] pb-1.5 pr-2 font-bold">Sale</th>
                  <th scope="col" className="w-[10%] pb-1.5 pr-2 font-bold">Qty</th>
                  <th scope="col" className="w-[13%] pb-1.5 pr-2 font-bold">Status</th>
                  <th scope="col" className="w-9 pb-1.5"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, index) => {
                  const name = variant.title || variantTitle(variant.option_values, parsedOptions) || `Variant ${index + 1}`;
                  return (
                    <tr key={variant.key} className="align-top">
                      <td className="py-1 pr-2"><input aria-label={`Variant ${index + 1} title`} value={variant.title} onChange={e => updateVariant(variant.key, { title: e.target.value })} placeholder={variantTitle(variant.option_values, parsedOptions) || 'e.g. Red / M'} required className={inputClass} /></td>
                      <td className="py-1 pr-2"><input aria-label={`SKU for ${name}`} value={variant.sku} onChange={e => updateVariant(variant.key, { sku: e.target.value })} required maxLength={100} className={`${inputClass} font-mono`} /></td>
                      <td className="py-1 pr-2"><input aria-label={`Price for ${name}`} type="number" min="0" step="0.01" value={variant.regular_price} onChange={e => updateVariant(variant.key, { regular_price: e.target.value })} required className={inputClass} /></td>
                      <td className="py-1 pr-2"><input aria-label={`Sale price for ${name}`} type="number" min="0" step="0.01" value={variant.sale_price} onChange={e => updateVariant(variant.key, { sale_price: e.target.value })} className={inputClass} /></td>
                      <td className="py-1 pr-2"><input aria-label={`Stock quantity for ${name}`} type="number" min="0" step="1" value={variant.stock_quantity} onChange={e => updateVariant(variant.key, { stock_quantity: e.target.value })} className={inputClass} /></td>
                      <td className="py-1 pr-2">
                        <select aria-label={`Stock status for ${name}`} value={variant.stock_status} onChange={e => updateVariant(variant.key, { stock_status: e.target.value })} className={`${inputClass} pr-7`}>
                          {STOCK_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                        </select>
                      </td>
                      <td className="py-1">
                        <button type="button" onClick={() => onVariantsChange(variants.filter(item => item.key !== variant.key))} aria-label={`Remove ${name}`} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
