import { formatMoney } from '../../utils/discounts';

const inputBox = (invalid) => `flex items-stretch w-full bg-slate-50 border rounded-xl overflow-hidden focus-within:ring-2 transition-all ${invalid ? 'border-red-400 focus-within:ring-red-500' : 'border-slate-200 focus-within:ring-emerald-500'}`;
const unitClass = 'flex items-center bg-slate-100 px-3 text-sm font-bold text-slate-600';

/**
 * A product's own negotiation limit: unit, first offer and maximum per piece.
 * `value` is { enabled, kind, first_offer, max_discount } (see productLimitFromProduct).
 * With `sellingPrice`, shows the lowest price the agent can agree to.
 * `toggle` false hides the on/off switch (the bulk dialog is always "on").
 */
export default function NegotiationLimitFields({ value, onChange, errors = {}, currency, sellingPrice = null, toggle = true, idPrefix = 'product-limit' }) {
  const set = (field, next) => onChange({ ...value, [field]: next });
  const isPercent = value.kind === 'percent';
  const unit = isPercent ? '%' : currency;
  const max = Number(value.max_discount);
  const price = Number(sellingPrice);
  const lowest = value.enabled && Number.isFinite(price) && price > 0 && Number.isFinite(max) && max > 0
    ? Math.max(0, isPercent ? price * (1 - Math.min(max, 100) / 100) : price - max)
    : null;

  const numberField = (field, label, hint) => (
    <div className="space-y-1 w-full">
      <label htmlFor={`${idPrefix}-${field}`} className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">{label}</label>
      <div className={inputBox(errors[field])}>
        {!isPercent && <span className={`${unitClass} border-r border-slate-200`}>{unit}</span>}
        <input
          id={`${idPrefix}-${field}`}
          type="number"
          min="0"
          step="0.01"
          value={value[field]}
          onChange={(e) => set(field, e.target.value)}
          aria-invalid={errors[field] ? 'true' : undefined}
          className="w-full bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
          placeholder={field === 'first_offer' ? '0' : ''}
        />
        {isPercent && <span className={`${unitClass} border-l border-slate-200`}>%</span>}
      </div>
      {errors[field]
        ? <p role="alert" className="m-0 text-[11px] font-semibold text-red-600">{errors[field]}</p>
        : <p className="m-0 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-3">
      {toggle && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-sm font-bold text-slate-700">Negotiation limit</p>
            <p className="m-0 mt-0.5 text-[11px] leading-relaxed text-slate-500">
              How much the agent may take off this product when a customer bargains. Wins over the agent's discount rules; variants use the same limit.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={value.enabled}
            aria-label="Set a negotiation limit for this product"
            onClick={() => set('enabled', !value.enabled)}
            className={`relative mt-0.5 h-6 w-12 shrink-0 rounded-full transition-colors ${value.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${value.enabled ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      )}
      {value.enabled && (
        <>
          <div className="inline-flex rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Limit unit">
            {[{ v: 'amount', label: `${currency} per piece` }, { v: 'percent', label: '% of the price' }].map(option => (
              <button
                key={option.v}
                type="button"
                role="radio"
                aria-checked={value.kind === option.v}
                onClick={() => set('kind', option.v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${value.kind === option.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {numberField('first_offer', 'First offer', 'The agent opens at or below this.')}
            {numberField('max_discount', 'Maximum', 'Never more than this per piece.')}
          </div>
          {lowest !== null && !errors.max_discount && (
            <p className="m-0 text-[11px] font-semibold text-slate-600">
              Lowest price the agent can agree to: {formatMoney(lowest.toFixed(2), currency)} a piece. Never below the cost price.
            </p>
          )}
        </>
      )}
    </div>
  );
}
