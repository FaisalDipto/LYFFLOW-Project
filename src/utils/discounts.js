// Discount settings: an agent's negotiation rules and coupons, and a product's own
// negotiation limit. Drafts keep numbers as strings while typing; toPayload turns them
// into the shape PATCH /v1/agent/update/{id} takes. The checks mirror the backend's 422s.

export const MAX_RULES = 20;
export const MAX_COUPONS = 10;
export const MAX_LIST_VALUES = 50;
export const NAME_MAX = 60;

export const SCOPES = [
  { value: 'all_products', label: 'All products' },
  { value: 'categories', label: 'Categories' },
  { value: 'tags', label: 'Tags' },
  { value: 'listed_products', label: 'Specific products' },
  { value: 'whole_order', label: 'Whole order' },
];

// The list each scope needs, with how the editor asks for it.
export const SCOPE_LIST = {
  categories: { field: 'categories', label: 'Categories', one: 'category', placeholder: 'saree, panjabi' },
  tags: { field: 'tags', label: 'Tags', one: 'tag', placeholder: 'eid, new-arrival' },
  listed_products: { field: 'product_codes', label: 'Product codes or SKUs', one: 'product code', placeholder: 'SH-01, SH-02-RED-M' },
};
const LIST_FIELDS = ['product_codes', 'categories', 'tags'];

let keySeed = 0;
const newKey = () => `d${Date.now().toString(36)}${(keySeed += 1)}`;

const text = (value) => (value === null || value === undefined ? '' : String(value));
const listText = (list) => (Array.isArray(list) ? list.join(', ') : '');
export const parseList = (value) => [...new Set(String(value || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean))];
const num = (value) => {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : NaN;
};
const decimal = (value) => {
  const parsed = num(value);
  return parsed === null || Number.isNaN(parsed) ? null : String(parsed);
};

// The agent's "today" (dates are inclusive, in its timezone).
export const todayIn = (timeZone) => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};
const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const conditionDraft = (item = {}) => ({
  scope: item.scope || 'all_products',
  product_codes: listText(item.product_codes),
  categories: listText(item.categories),
  tags: listText(item.tags),
  min_unit_price: text(item.min_unit_price),
  max_unit_price: text(item.max_unit_price),
  min_quantity: item.min_quantity && Number(item.min_quantity) > 1 ? String(item.min_quantity) : '',
  min_order_subtotal: text(item.min_order_subtotal),
});

export const ruleToDraft = (rule = {}) => ({
  key: newKey(),
  name: rule.name || '',
  ...conditionDraft(rule),
  discount_kind: rule.discount_kind === 'percent' ? 'percent' : 'amount',
  first_offer: text(rule.first_offer),
  max_discount: text(rule.max_discount),
  max_discount_amount: text(rule.max_discount_amount),
});

export const couponToDraft = (coupon = {}, timeZone) => {
  const today = todayIn(timeZone);
  return {
    key: newKey(),
    name: coupon.name || '',
    starts_on: coupon.starts_on || today,
    ends_on: coupon.ends_on || addDays(today, 6),
    ...conditionDraft(coupon),
    discount_kind: ['percent', 'free_delivery'].includes(coupon.discount_kind) ? coupon.discount_kind : 'amount',
    discount_value: text(coupon.discount_value),
    max_discount_amount: text(coupon.max_discount_amount),
  };
};

const conditionPayload = (draft) => {
  const isOrder = draft.scope === 'whole_order';
  const lists = Object.fromEntries(LIST_FIELDS.map(field => [field, SCOPE_LIST[draft.scope]?.field === field ? parseList(draft[field]) : []]));
  return {
    scope: draft.scope,
    ...lists,
    min_unit_price: isOrder ? null : decimal(draft.min_unit_price),
    max_unit_price: isOrder ? null : decimal(draft.max_unit_price),
    min_quantity: isOrder ? 1 : (Number.parseInt(draft.min_quantity, 10) || 1),
    min_order_subtotal: decimal(draft.min_order_subtotal),
  };
};

export const ruleToPayload = (draft) => {
  const isPercent = draft.discount_kind === 'percent';
  const payload = {
    name: draft.name.trim(),
    ...conditionPayload(draft),
    discount_kind: draft.discount_kind,
    first_offer: decimal(draft.first_offer) ?? '0',
    max_discount: decimal(draft.max_discount),
    max_discount_amount: isPercent ? decimal(draft.max_discount_amount) : null,
  };
  if (draft.scope !== 'whole_order') payload.min_order_subtotal = null;
  return payload;
};

export const couponToPayload = (draft) => {
  const kind = draft.discount_kind;
  return {
    name: draft.name.trim(),
    starts_on: draft.starts_on,
    ends_on: draft.ends_on,
    ...conditionPayload(draft),
    discount_kind: kind,
    discount_value: kind === 'free_delivery' ? null : decimal(draft.discount_value),
    max_discount_amount: kind === 'percent' ? decimal(draft.max_discount_amount) : null,
  };
};

// Field errors for one draft, keyed by field; empty when it can be saved.
const conditionErrors = (draft, { subtotalAnyScope }) => {
  const errors = {};
  const list = SCOPE_LIST[draft.scope];
  if (list) {
    const values = parseList(draft[list.field]);
    if (values.length === 0) errors[list.field] = `Add at least one ${list.one}.`;
    else if (values.length > MAX_LIST_VALUES) errors[list.field] = `At most ${MAX_LIST_VALUES} values.`;
  }
  if (draft.scope !== 'whole_order') {
    const min = num(draft.min_unit_price);
    const max = num(draft.max_unit_price);
    if (Number.isNaN(min) || min < 0) errors.min_unit_price = 'Enter 0 or more.';
    if (max !== null && (Number.isNaN(max) || max <= 0)) errors.max_unit_price = 'Enter more than 0.';
    else if (min !== null && max !== null && !Number.isNaN(min) && max <= min) errors.max_unit_price = 'Must be above the lower price.';
    const qty = num(draft.min_quantity);
    if (qty !== null && (!Number.isInteger(qty) || qty < 1)) errors.min_quantity = 'Enter a whole number, 1 or more.';
  }
  if (draft.scope === 'whole_order' || subtotalAnyScope) {
    const subtotal = num(draft.min_order_subtotal);
    if (Number.isNaN(subtotal) || subtotal < 0) errors.min_order_subtotal = 'Enter 0 or more.';
  }
  return errors;
};

export const ruleErrors = (draft) => {
  const errors = conditionErrors(draft, { subtotalAnyScope: false });
  if (!draft.name.trim()) errors.name = 'Give the rule a name.';
  else if (draft.name.trim().length > NAME_MAX) errors.name = `At most ${NAME_MAX} characters.`;
  const isPercent = draft.discount_kind === 'percent';
  const first = num(draft.first_offer);
  const max = num(draft.max_discount);
  if (max === null || Number.isNaN(max) || max <= 0) errors.max_discount = 'Enter a maximum above 0.';
  else if (isPercent && max > 100) errors.max_discount = 'A percent can’t be above 100.';
  if (Number.isNaN(first) || (first !== null && first < 0)) errors.first_offer = 'Enter 0 or more.';
  else if (first !== null && !errors.max_discount && first > max) errors.first_offer = 'Can’t be above the maximum.';
  if (isPercent) {
    const cap = num(draft.max_discount_amount);
    if (Number.isNaN(cap) || (cap !== null && cap <= 0)) errors.max_discount_amount = 'Enter more than 0, or leave empty.';
  }
  return errors;
};

export const couponErrors = (draft) => {
  const errors = conditionErrors(draft, { subtotalAnyScope: true });
  if (!draft.name.trim()) errors.name = 'Give the coupon a name.';
  else if (draft.name.trim().length > NAME_MAX) errors.name = `At most ${NAME_MAX} characters.`;
  if (!draft.starts_on) errors.starts_on = 'Pick a start date.';
  if (!draft.ends_on) errors.ends_on = 'Pick an end date.';
  else if (draft.starts_on && draft.ends_on < draft.starts_on) errors.ends_on = 'Must be on or after the start date.';
  if (draft.discount_kind === 'free_delivery') {
    if (draft.scope !== 'whole_order') errors.scope = 'Free delivery applies to the whole order.';
  } else {
    const value = num(draft.discount_value);
    if (value === null || Number.isNaN(value) || value <= 0) errors.discount_value = 'Enter more than 0.';
    else if (draft.discount_kind === 'percent' && value > 100) errors.discount_value = 'A percent can’t be above 100.';
  }
  if (draft.discount_kind === 'percent') {
    const cap = num(draft.max_discount_amount);
    if (Number.isNaN(cap) || (cap !== null && cap <= 0)) errors.max_discount_amount = 'Enter more than 0, or leave empty.';
  }
  return errors;
};

// Active today, not started yet, or ended (dates inclusive, in the agent's timezone).
export const couponStatus = (coupon, timeZone) => {
  const today = todayIn(timeZone);
  if (coupon.ends_on && coupon.ends_on < today) return 'ended';
  if (coupon.starts_on && coupon.starts_on > today) return 'scheduled';
  return 'active';
};

const fmtNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
};
export const formatMoney = (value, currency) => `${currency || ''} ${fmtNumber(value)}`.trim();
const formatOff = (value, kind, currency) => (kind === 'percent' ? `${fmtNumber(value)}%` : formatMoney(value, currency));

export const formatDay = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const listPreview = (values) => (values.length > 3 ? `${values.slice(0, 3).join(', ')} +${values.length - 3}` : values.join(', '));

// "Sarees · over BDT 350 · 2+ pieces": what a rule or coupon covers.
export const describeCoverage = (item, currency) => {
  const parts = [];
  const list = SCOPE_LIST[item.scope];
  const values = list ? (Array.isArray(item[list.field]) ? item[list.field] : parseList(item[list.field])) : [];
  if (item.scope === 'all_products') parts.push('All products');
  else if (item.scope === 'whole_order') parts.push('Whole order');
  else parts.push(values.length ? listPreview(values) : list.label);
  const min = num(item.min_unit_price);
  const max = num(item.max_unit_price);
  if (item.scope !== 'whole_order') {
    if (min !== null && !Number.isNaN(min) && min > 0 && max !== null && !Number.isNaN(max)) parts.push(`${formatMoney(min, currency)}–${fmtNumber(max)}`);
    else if (max !== null && !Number.isNaN(max)) parts.push(`under ${formatMoney(max, currency)}`);
    else if (min !== null && !Number.isNaN(min) && min > 0) parts.push(`${formatMoney(min, currency)} and up`);
    const qty = Number(item.min_quantity) || 1;
    if (qty > 1) parts.push(`${qty}+ pieces`);
  }
  const subtotal = num(item.min_order_subtotal);
  if (subtotal !== null && !Number.isNaN(subtotal) && subtotal > 0) parts.push(`orders over ${formatMoney(subtotal, currency)}`);
  return parts.join(' · ');
};

// "BDT 20 first, up to BDT 30 a piece".
export const describeRuleDiscount = (rule, currency) => {
  if (num(rule.max_discount) === null) return 'No discount set';
  const per = rule.scope === 'whole_order' ? (rule.discount_kind === 'percent' ? ' of the order' : ' an order') : (rule.discount_kind === 'percent' ? '' : ' a piece');
  const first = num(rule.first_offer);
  const cap = rule.discount_kind === 'percent' && num(rule.max_discount_amount) ? `, max ${formatMoney(rule.max_discount_amount, currency)}` : '';
  const head = first !== null && !Number.isNaN(first) ? `${formatOff(first, rule.discount_kind, currency)} first, ` : '';
  return `${head}up to ${formatOff(rule.max_discount, rule.discount_kind, currency)}${per}${cap}`;
};

// "10% off, max BDT 200" or "Free delivery".
export const describeCouponDiscount = (coupon, currency) => {
  if (coupon.discount_kind === 'free_delivery') return 'Free delivery';
  if (num(coupon.discount_value) === null) return 'No discount set';
  const cap = coupon.discount_kind === 'percent' && num(coupon.max_discount_amount) ? `, max ${formatMoney(coupon.max_discount_amount, currency)}` : '';
  const per = coupon.discount_kind === 'amount' && coupon.scope !== 'whole_order' ? ' a piece' : '';
  return `${formatOff(coupon.discount_value, coupon.discount_kind, currency)} off${per}${cap}`;
};

// Product limit ("negotiation_*" trio). All three set, or none.
export const productLimitFromProduct = (product = {}) => ({
  kind: product.negotiation_discount_kind === 'percent' ? 'percent' : 'amount',
  first_offer: text(product.negotiation_first_offer),
  max_discount: text(product.negotiation_max_discount),
  enabled: product.negotiation_discount_kind != null && product.negotiation_max_discount != null,
});

export const productLimitErrors = (limit) => {
  if (!limit.enabled) return {};
  const errors = {};
  const first = num(limit.first_offer);
  const max = num(limit.max_discount);
  if (max === null || Number.isNaN(max) || max <= 0) errors.max_discount = 'Enter a maximum above 0.';
  else if (limit.kind === 'percent' && max > 100) errors.max_discount = 'A percent can’t be above 100.';
  if (first === null || Number.isNaN(first) || first < 0) errors.first_offer = 'Enter 0 or more.';
  else if (!errors.max_discount && first > max) errors.first_offer = 'Can’t be above the maximum.';
  return errors;
};

export const productLimitPayload = (limit) => (limit.enabled
  ? { negotiation_discount_kind: limit.kind, negotiation_first_offer: decimal(limit.first_offer), negotiation_max_discount: decimal(limit.max_discount) }
  : { negotiation_discount_kind: null, negotiation_first_offer: null, negotiation_max_discount: null });

export const describeProductLimit = (product, currency) => {
  if (product?.negotiation_max_discount == null) return null;
  const kind = product.negotiation_discount_kind;
  return `${formatOff(product.negotiation_first_offer ?? 0, kind, currency)} first, up to ${formatOff(product.negotiation_max_discount, kind, currency)} a piece`;
};

// Order items: `discount` is per piece; older orders have none (0).
export const itemDiscount = (item) => {
  const value = Number(item?.discount);
  return Number.isFinite(value) && value > 0 ? value : 0;
};
export const orderDiscountTotal = (items) => (Array.isArray(items)
  ? items.reduce((sum, item) => sum + itemDiscount(item) * (Number(item.quantity) || 1), 0)
  : 0);
