// Customer follow-ups: an agent's reminder settings (follow_up_settings) as the form edits
// them, the backend's checks, and the times shown in the inbox.

export const MAX_STEPS = 3;
export const MIN_DELAY = 30;
export const MAX_DELAY = 1380; // 23 hours: a reminder goes out before Meta's 24 hours end.
export const MIN_GAP = 60;
export const FIXED_TEXT_MAX = 500;
export const INSTRUCTION_MAX = 300;
export const DEFAULT_NIGHT = { start: '23:00', end: '08:00' };

/** Support agents never send follow-ups. */
export const isSupportAgent = (agent) => /support/i.test(String(agent?.role || agent?.agent_role || ''));

let nextKey = 0;
const key = () => `fu_${(nextKey += 1)}`;

const hhmm = (value) => (typeof value === 'string' && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : '');

export const stepToDraft = (step = {}) => ({
  key: key(),
  delay: String(step.delay_minutes ?? 120),
  mode: step.fixed_text ? 'fixed' : 'agent',
  fixed_text: step.fixed_text || '',
  instruction: step.instruction || '',
});

/** The form's state from the saved settings; null (off) starts from the defaults for a new agent. */
export const settingsToDraft = (settings) => {
  const source = settings || {};
  const nightStart = settings ? hhmm(settings.night_hours_start) : DEFAULT_NIGHT.start;
  const nightEnd = settings ? hhmm(settings.night_hours_end) : DEFAULT_NIGHT.end;
  const hasNight = Boolean(nightStart && nightEnd);
  return {
    is_enabled: Boolean(settings?.is_enabled),
    steps: (source.steps?.length ? source.steps : [{ delay_minutes: 120 }]).slice(0, MAX_STEPS).map(stepToDraft),
    night_on: hasNight,
    night_start: hasNight ? nightStart : DEFAULT_NIGHT.start,
    night_end: hasNight ? nightEnd : DEFAULT_NIGHT.end,
    use_discounts: settings ? settings.use_discounts !== false : true,
  };
};

const blankToNull = (text) => (text.trim() ? text.trim() : null);

/** PATCH body for follow_up_settings (the whole object; the backend has no partial update). */
export const draftToSettings = (draft) => ({
  is_enabled: draft.is_enabled,
  steps: draft.steps.map(step => ({
    delay_minutes: Number(step.delay),
    fixed_text: step.mode === 'fixed' ? blankToNull(step.fixed_text) : null,
    // The backend ignores the note when the text is fixed; don't keep a hidden one.
    instruction: step.mode === 'agent' ? blankToNull(step.instruction) : null,
  })),
  night_hours_start: draft.night_on ? draft.night_start : null,
  night_hours_end: draft.night_on ? draft.night_end : null,
  use_discounts: draft.use_discounts,
});

/** The backend's checks, per step key and for the night hours. Empty objects when valid. */
export const draftErrors = (draft) => {
  const steps = {};
  draft.steps.forEach((step, index) => {
    const errors = {};
    const delay = Number(step.delay);
    if (step.delay === '' || !Number.isInteger(delay)) errors.delay = 'Enter whole minutes.';
    else if (delay < MIN_DELAY) errors.delay = `Wait at least ${MIN_DELAY} minutes.`;
    else if (delay > MAX_DELAY) errors.delay = 'At most 23 hours, so it goes out before Meta\'s 24 hours end.';
    else if (index > 0) {
      const previous = Number(draft.steps[index - 1].delay);
      if (Number.isInteger(previous) && delay < previous + MIN_GAP) errors.delay = `At least 60 minutes after reminder ${index} (${formatDelay(previous + MIN_GAP)} or later).`;
    }
    if (step.mode === 'fixed' && !step.fixed_text.trim()) errors.fixed_text = 'Write the text, or let the agent write it.';
    if (step.fixed_text.length > FIXED_TEXT_MAX) errors.fixed_text = `At most ${FIXED_TEXT_MAX} characters.`;
    if (step.mode === 'agent' && step.instruction.length > INSTRUCTION_MAX) errors.instruction = `At most ${INSTRUCTION_MAX} characters.`;
    if (Object.keys(errors).length) steps[step.key] = errors;
  });
  let night = null;
  if (draft.night_on) {
    if (!draft.night_start || !draft.night_end) night = 'Set both times, or turn night hours off.';
    else if (draft.night_start === draft.night_end) night = 'Night hours must start and end at different times.';
  }
  return { steps, night, count: Object.keys(steps).length + (night ? 1 : 0) };
};

/** "2 h", "45 min", "1 h 30 min". */
export function formatDelay(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value)) return '';
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** The next delay to offer when adding a reminder: 2 hours after the last one, within the limits. */
export const nextDelay = (steps) => {
  const last = Number(steps[steps.length - 1]?.delay) || 0;
  return Math.min(MAX_DELAY, Math.max(last + MIN_GAP, last + 120));
};

/** "14:30", "tomorrow 09:10" or "Fri 09:10", for "Next follow-up at …". */
export function formatFollowUpTime(iso, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const day = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((day(date) - day(now)) / 86400000);
  if (days === 0) return time;
  if (days === 1) return `tomorrow ${time}`;
  return `${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} ${time}`;
}

/** "in 1 h 20 min", "in 5 min", or "now" once it's due. */
export function formatFollowUpIn(iso, now = Date.now()) {
  const minutes = Math.round((Date.parse(iso) - now) / 60000);
  if (!Number.isFinite(minutes)) return '';
  if (minutes <= 0) return 'due now';
  return `in ${formatDelay(minutes)}`;
}
