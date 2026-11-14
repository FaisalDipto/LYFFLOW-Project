// An order's purchase as sent to Meta (meta_purchase_status, _sent_at, _error). The system
// sends it 30 minutes after the order; null means the page wasn't sending purchases then.

const time = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

/**
 * { short, long, tone, error } for an order, or null when there's nothing to show.
 * `short` fits a list row; `long` is the full sentence for a detail view.
 */
export function metaPurchaseLabel(order) {
  const status = order?.meta_purchase_status;
  const error = order?.meta_purchase_error || null;
  switch (status) {
    case 'pending':
    case 'sending': {
      // Still pending well after the 30 minutes: Meta can't be reached and the system keeps trying.
      const late = Date.now() - Date.parse(order.created_at || '') > 45 * 60000;
      return late
        ? { short: 'Waiting for Meta', long: "Not sent yet: Meta couldn't be reached. Lyfflow tries again every hour for 7 days", tone: 'muted', error: null }
        : { short: 'To Meta soon', long: 'Will be sent to Meta 30 minutes after the order', tone: 'muted', error: null };
    }
    case 'sent': {
      const at = time(order.meta_purchase_sent_at);
      return { short: 'Sent to Meta', long: at ? `Sent to Meta ${at}` : 'Sent to Meta', tone: 'good', error: null, at };
    }
    case 'not_sent':
      return { short: 'Not sent to Meta', long: 'Not sent to Meta', tone: 'warn', error };
    case 'failed':
      return { short: 'Meta: failed', long: 'Failed to send to Meta', tone: 'bad', error };
    default:
      return null;
  }
}

/**
 * What the owner can do about a purchase error, from its wording: 'reconnect' or null.
 * Reasons the owner can act on end in "Reconnect the page"; ones from before 2026-11-12
 * may still say "Use "Connect ads" again", which now means the same normal reconnect.
 */
export function metaPurchaseFix(error) {
  if (!error) return null;
  return /reconnect the page|connect ads/i.test(error) ? 'reconnect' : null;
}

export const META_PURCHASE_TONES = {
  good: 'text-emerald-700',
  muted: 'text-slate-500',
  warn: 'text-amber-700',
  bad: 'text-rose-700',
};
