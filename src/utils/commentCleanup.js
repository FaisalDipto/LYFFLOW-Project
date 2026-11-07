// Copy and helpers for comment cleanup runs and the per-post moderation switch.

// The backend answers with a code, either as `detail.code` (apiFetch puts it on
// `error.code`) or as the plain `detail` string, e.g. "post_not_found:1234_5678".
export const cleanupErrorCode = (error) => {
  if (error?.code) return String(error.code).split(':')[0];
  const message = typeof error?.message === 'string' ? error.message : '';
  return /^[a-z_]+(:.*)?$/.test(message) ? message.split(':')[0] : null;
};

const ERROR_COPY = {
  page_not_found: "This page isn't connected to your business anymore.",
  page_reconnect_required: 'Reconnect this page to read its posts and comments. Pages connected before comment cleanup need the new permission.',
  facebook_api_error: "Meta didn't answer. Try again in a few minutes.",
  subscription_required: 'Comment cleanup needs an active subscription.',
  page_has_no_agent: 'Assign an agent to this page first. The agent decides what happens to each comment.',
  run_not_found: 'That cleanup no longer exists.',
  run_not_cancellable: 'This cleanup has already finished.',
};

export const cleanupErrorText = (error, fallback = 'Something went wrong. Try again.') => {
  const code = cleanupErrorCode(error);
  if (code === 'post_not_found') {
    const postId = String(error?.code || error?.message || '').split(':')[1];
    return `One of the posts${postId ? ` (${postId})` : ''} is gone or isn't from this page. Refresh the list and try again.`;
  }
  if (code && ERROR_COPY[code]) return ERROR_COPY[code];
  if (error?.status === 403) return 'Only admins and the owner can do this.';
  return error?.message || fallback;
};

export const RUN_STATUS = {
  queued: { label: 'Queued', className: 'bg-slate-100 text-slate-600' },
  running: { label: 'Running', className: 'bg-sky-50 text-sky-700' },
  paused: { label: 'Paused', className: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700' },
  failed: { label: 'Failed', className: 'bg-rose-50 text-rose-700' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500' },
};

export const ACTIVE_RUN_STATUSES = ['queued', 'running', 'paused'];
export const isRunActive = (run) => ACTIVE_RUN_STATUSES.includes(run?.status);
// Counters only move while these are true, so polling stops otherwise.
export const isRunMoving = (run) => run?.status === 'queued' || run?.status === 'running';

export const PAUSE_REASON_COPY = {
  credits_exhausted: 'Paused: out of credits. It continues after a new or upgraded subscription.',
  subscription_inactive: 'Paused: subscription inactive.',
  page_reconnect_required: 'Paused: reconnect the page to continue.',
};

export const pauseReasonText = (reason) => PAUSE_REASON_COPY[reason] || 'Paused. It continues by itself once the cause clears.';

export const formatCredits = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export const formatCount = (value) => (value == null ? '—' : Number(value).toLocaleString());

export const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';
};

export const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
};

/** "in about 3 hours" style, for the estimated finish time. */
export const formatFromNow = (value) => {
  const time = value ? Date.parse(value) : NaN;
  if (Number.isNaN(time)) return '';
  const minutes = Math.round((time - Date.now()) / 60000);
  if (minutes <= 1) return 'within a minute';
  if (minutes < 60) return `in about ${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in about ${hours} hour${hours === 1 ? '' : 's'}`;
  return `in about ${Math.round(hours / 24)} days`;
};

/** Share of the run done, 0–100, counting skipped comments as done. */
export const runProgress = (run) => {
  if (!run) return 0;
  if (run.status === 'completed') return 100;
  const total = Number(run.estimated_comments) || 0;
  if (!total) return 0;
  return Math.min(100, Math.round(((Number(run.processed_count) + Number(run.skipped_count)) / total) * 100));
};
