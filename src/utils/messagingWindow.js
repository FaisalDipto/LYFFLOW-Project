// Meta's reply windows, as GET .../window-status describes them:
//   standard  inside 24h of the customer's last message: AI and people can reply
//   human     24h to 7 days: people only, sent with Meta's HUMAN_AGENT tag
//   closed    past 7 days: nothing goes out until the customer writes again
export const messagingWindowState = (status) => {
  if (!status) return null;
  if (status.can_send_ai) return 'standard';
  if (status.can_send_human) return 'human';
  return 'closed';
};

// Seconds left in the window that currently applies, counted from `now`. Prefers the
// expiry timestamps; falls back to the remaining seconds as of `fetchedAt`.
export const windowSecondsLeft = (status, now = Date.now(), fetchedAt = now) => {
  const state = messagingWindowState(status);
  if (state !== 'standard' && state !== 'human') return 0;
  const expiresAt = state === 'standard' ? status.standard_window_expires_at : status.human_agent_window_expires_at;
  const parsed = expiresAt ? Date.parse(expiresAt) : NaN;
  if (Number.isFinite(parsed)) return Math.max(0, (parsed - now) / 1000);
  const remaining = state === 'standard' ? status.standard_window_remaining_seconds : status.human_agent_window_remaining_seconds;
  return Math.max(0, (Number(remaining) || 0) - (now - fetchedAt) / 1000);
};

// "5d 3h", "18h 20m", "42m", "under a minute".
export const formatWindowDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return 'under a minute';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return hours ? `${days}d ${hours}h` : `${days}d`;
  const mins = minutes % 60;
  if (hours > 0) return mins ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
};
