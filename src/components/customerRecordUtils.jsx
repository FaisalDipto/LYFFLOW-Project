/**
 * Shared helpers for rendering customer order records.
 *
 * These live outside CustomerRecords.jsx so that file only exports its
 * component, which is what Fast Refresh needs to reload it reliably.
 */

import { Bot } from 'lucide-react';

export const parseOrderAmount = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  const cleanStr = String(val).trim();
  if (!cleanStr) return null;
  const num = Number(cleanStr);
  return Number.isFinite(num) ? num : null;
};

// "BDT 1,250.00": the business's currency code, as product prices show it.
export const formatOrderAmount = (val, currency = 'BDT', fallback = '—') => {
  const num = parseOrderAmount(val);
  if (num === null) return fallback;
  if (Math.abs(num) > 1e11) {
    return `${currency} ${num.toExponential(2)}`;
  }
  return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// "Cotton T-Shirt ×2 +1 more" for an order's items.
export const summarizeOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return 'No items';
  const [first, ...rest] = items;
  const head = `${first.name}${first.quantity > 1 ? ` ×${first.quantity}` : ''}`;
  return rest.length ? `${head} +${rest.length} more` : head;
};

// "Oct 17, 2026"; with `withTime`, "Oct 17, 2026, 2:30 PM". Empty for bad dates.
export const formatOrderDate = (value, { withTime = false } = {}) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
};

// Badge colours for lead and order statuses.
export const recordStatusClass = (status) => {
  switch (status) {
    case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'pending':
    case 'hold':
    case 'in_review': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'contacted': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'converted':
    case 'delivered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'cancelled':
    case 'cancelled_approval_pending': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const renderOrderSourceBadge = (source) => {
  if (!source) return null;
  const isAi = String(source).toLowerCase() === 'ai';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
        isAi
          ? 'bg-purple-50 text-purple-700 border-purple-200'
          : 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
      title={`Source: ${source}`}
    >
      {isAi ? <Bot size={12} className="text-purple-600" /> : null}
      {isAi ? 'AI' : source}
    </span>
  );
};
