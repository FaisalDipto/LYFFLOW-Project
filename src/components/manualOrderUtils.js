// Mirrors OrderStatus in the API schema; `new` is the endpoint's default.
export const ORDER_STATUSES = [
  'new', 'pending', 'delivered_approval_pending', 'partial_delivered_approval_pending',
  'cancelled_approval_pending', 'unknown_approval_pending', 'delivered',
  'partial_delivered', 'cancelled', 'hold', 'in_review', 'unknown'
];

// Field limits come straight from ManualOrderCreateRequest / ManualOrderUpdateRequest
// so the form rejects what the backend would reject anyway, before the round trip.
export const LIMITS = {
  contact_name: 200,
  contact_phone: 50,
  contact_email: 254,
  delivery_address: 200,
};

export const EMPTY_ITEM = { name: '', quantity: '1', price: '' };

export const EMPTY_ORDER_FORM = {
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  delivery_address: '',
  delivery_charge: '',
  notes: '',
  status: 'new',
};

export const toAmount = (val) => {
  const num = Number(String(val ?? '').trim());
  return Number.isFinite(num) ? num : 0;
};

// Converts an order as the API returns it into the form's string-based state.
export const orderToFormState = (order = {}) => ({
  form: {
    contact_name: order.contact_name || '',
    contact_phone: order.contact_phone || '',
    contact_email: order.contact_email || '',
    delivery_address: order.delivery_address || '',
    delivery_charge: order.delivery_charge === null || order.delivery_charge === undefined ? '' : String(order.delivery_charge),
    notes: order.notes || '',
    status: order.status || 'new',
  },
  items: Array.isArray(order.order_items) && order.order_items.length > 0
    ? order.order_items.map(item => ({
        name: item.name || '',
        quantity: String(item.quantity ?? 1),
        price: item.price === null || item.price === undefined ? '' : String(item.price),
      }))
    : [{ ...EMPTY_ITEM }],
});

// Trimmed, typed values in the shape both order endpoints accept. Empty optional
// strings stay as '' so callers decide whether that means "omit" or "clear".
export const normalizeOrderValues = (form, items) => ({
  contact_name: form.contact_name.trim(),
  contact_phone: form.contact_phone.trim(),
  contact_email: form.contact_email.trim(),
  delivery_address: form.delivery_address.trim(),
  notes: form.notes.trim(),
  status: form.status,
  delivery_charge: toAmount(form.delivery_charge).toFixed(2),
  order_items: items
    .filter(item => item.name.trim())
    .map(item => ({
      name: item.name.trim(),
      quantity: Number(item.quantity),
      price: Number(item.price),
    })),
});
