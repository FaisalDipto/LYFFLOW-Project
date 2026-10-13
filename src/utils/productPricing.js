// Product pricing, stock and variant helpers for the product/variant API.
// Prices arrive as decimal strings ("1170.00") on lists and may be numbers elsewhere.

export const STOCK_STATUSES = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'on_backorder', label: 'On backorder' },
];

export const PRODUCT_TYPES = [
  { value: 'simple', label: 'Simple' },
  { value: 'variable', label: 'Variable (has variants)' },
];

const STOCK_LABELS = Object.fromEntries(STOCK_STATUSES.map(({ value, label }) => [value, label]));
// Older or hand-written data may use the spellings without underscores.
const STOCK_ALIASES = { instock: 'in_stock', outofstock: 'out_of_stock', onbackorder: 'on_backorder' };

export const normalizeStockStatus = (value) => {
  const key = String(value || '').toLowerCase();
  return STOCK_ALIASES[key] || (STOCK_LABELS[key] ? key : 'in_stock');
};

export const stockLabel = (value) => STOCK_LABELS[normalizeStockStatus(value)];

// A price from the API (number or decimal string) as a number, or null when empty.
export const toAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

export const formatAmount = (value, currency = 'BDT') => {
  const amount = toAmount(value);
  if (amount === null) return '—';
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// A sale only counts when it is lower than the regular price.
export const isOnSale = (regularPrice, salePrice) => {
  const regular = toAmount(regularPrice);
  const sale = toAmount(salePrice);
  return sale !== null && regular !== null && sale < regular;
};

// "Red / M" from { Color: 'Red', Size: 'M' }, in the options' declared order.
export const variantTitle = (optionValues, options = []) => {
  const order = options.map(option => option.name);
  const keys = [...order.filter(name => name in (optionValues || {})), ...Object.keys(optionValues || {}).filter(name => !order.includes(name))];
  return keys.map(key => optionValues[key]).filter(Boolean).join(' / ');
};

// Every combination of the options' values: [{ Color: 'Red', Size: 'M' }, ...].
export const optionCombinations = (options) => {
  const usable = options.filter(option => option.name.trim() && option.values.length > 0);
  if (usable.length === 0) return [];
  return usable.reduce(
    (combos, option) => combos.flatMap(combo => option.values.map(value => ({ ...combo, [option.name.trim()]: value }))),
    [{}],
  );
};

// "Red, Blue , Green" → ['Red', 'Blue', 'Green'] (trimmed, blanks and repeats dropped).
export const parseOptionValues = (text) => [...new Set(String(text || '').split(',').map(value => value.trim()).filter(Boolean))];

// SKU suggestion for a generated variant: CODE-RED-M.
export const suggestSku = (productCode, optionValues) => [productCode, ...Object.values(optionValues || {})]
  .filter(Boolean)
  .map(part => String(part).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, ''))
  .filter(Boolean)
  .join('-');

// Stable React keys for option/variant rows that have no server id yet.
let rowKeySeed = 0;
export const newRowKey = () => `row_${Date.now()}_${rowKeySeed++}`;
