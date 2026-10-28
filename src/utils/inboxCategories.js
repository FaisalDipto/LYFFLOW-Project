// Inbox category tabs, grouped from a conversation's handover_category (why the AI handed
// it to a person). Only handed-over conversations have one, so a category tab lists those.
export const INBOX_CATEGORIES = [
  { id: 'all', label: 'All contacts', categories: null },
  { id: 'orders', label: 'Orders & delivery', categories: ['order_status_or_delivery', 'order_change_or_cancel'] },
  { id: 'complaints', label: 'Complaints & returns', categories: ['complaint_refund_return'] },
  { id: 'product', label: 'Product questions', categories: ['missing_knowledge', 'product_identification'] },
  { id: 'pricing', label: 'Pricing & bulk', categories: ['bulk_custom_or_pricing'] },
  { id: 'person', label: 'Asked for a person', categories: ['customer_asked_human'] },
  // Everything else handed over: other, system failures, manual pauses (no category) and
  // any category added later.
  { id: 'other', label: 'Other', categories: [] },
];

const GROUPED = new Set(INBOX_CATEGORIES.flatMap(tab => tab.categories || []));

/** Whether a conversation belongs under a category tab. */
export function matchesInboxCategory(row, tabId) {
  const tab = INBOX_CATEGORIES.find(item => item.id === tabId);
  if (!tab || !tab.categories) return true;
  if (!row?.is_human_needed) return false;
  if (tab.id === 'other') return !GROUPED.has(row.handover_category);
  return tab.categories.includes(row.handover_category);
}
