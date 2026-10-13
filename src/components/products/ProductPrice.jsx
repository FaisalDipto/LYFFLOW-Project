import { formatAmount, isOnSale } from '../../utils/productPricing';

const SIZES = {
  sm: { current: 'text-sm font-semibold', was: 'text-xs' },
  md: { current: 'text-base font-semibold', was: 'text-xs' },
  lg: { current: 'text-2xl sm:text-3xl font-bold tracking-tight', was: 'text-sm' },
};

// The selling price, with the regular price struck through when a lower sale price
// is set. Prices may be numbers or the API's decimal strings.
export default function ProductPrice({ regularPrice, salePrice, currency = 'BDT', size = 'md' }) {
  const style = SIZES[size] || SIZES.md;
  if (isOnSale(regularPrice, salePrice)) {
    return (
      <span className="product-price inline-flex flex-wrap items-baseline gap-x-2">
        <span className={`${style.current} text-emerald-600`}>{formatAmount(salePrice, currency)}</span>
        <span className={`${style.was} text-slate-400 line-through`}>
          <span className="sr-only">Regular price </span>{formatAmount(regularPrice, currency)}
        </span>
      </span>
    );
  }
  return <span className={`product-price ${style.current} text-slate-900`}>{formatAmount(regularPrice, currency)}</span>;
}
