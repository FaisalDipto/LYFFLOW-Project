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

export const formatOrderAmount = (val, currency = '$', fallback = '—') => {
  const num = parseOrderAmount(val);
  if (num === null) return fallback;
  if (Math.abs(num) > 1e11) {
    return `${currency}${num.toExponential(2)}`;
  }
  return `${currency}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
