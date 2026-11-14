import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronDown, Info, Moon, Plus, Tag, Trash2, X } from 'lucide-react';
import SavedBadge from '../SavedBadge';
import {
  FIXED_TEXT_MAX, INSTRUCTION_MAX, MAX_DELAY, MAX_STEPS, draftErrors, draftToSettings, formatDelay,
  isSupportAgent, nextDelay, settingsToDraft, stepToDraft,
} from '../../utils/followUps';
import './AgentDiscounts.css';
import './AgentFollowUps.css';

const Switch = ({ checked, onChange, label, disabled }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="fu-switch" onClick={() => onChange(!checked)}>
    <span />
  </button>
);

// Who gets a follow-up and what the agent does: fixed by Lyfflow, listed for the owner.
const WHO_RULES = [
  'Only customers who showed interest: in the last 24 hours the agent looked up a product, your knowledge or a discount, or showed a product.',
  'Only when the customer is the quiet one. If their message is the newest, they are waiting for you and no follow-up goes out.',
  'Not when an order or a lead was created in this chat in the last 24 hours, even if the order was cancelled later.',
  'Not when the chat is with a person, the agent can\'t reply right now (page disconnected, inbox management off, no credits), or follow-ups are off for the chat.',
  'At most 3 follow-ups in one chat in 24 hours.',
  'A customer who didn\'t answer the last follow-up for 24 hours gets none in that chat for 7 days after it.',
  'Nothing after Meta\'s 24 hours end, minus a 1-hour margin. A reminder that can\'t go out before then is dropped, with the ones after it.',
  'Nothing during the night hours. A reminder due then waits until they end.',
];
const AGENT_RULES = [
  'A customer who asked not to be contacted never gets one.',
  'The agent decides from the conversation whether a reminder makes sense. When it doesn\'t, nothing is sent and nothing is charged.',
  'A customer who said no gets a follow-up only when you have a discount to offer, and then it offers that discount.',
  'Discounts come only from your negotiation rules, coupons and product limits, never above your maximum. The agent offers a negotiated discount on its own at most once in 30 days per chat.',
  'No pressure, no made-up deadlines or stock claims, no repeated text.',
];

const hoursOf = (delay) => Math.floor((Number(delay) || 0) / 60);
const minutesOf = (delay) => (Number(delay) || 0) % 60;

/** 0 to 24 hours after the last message, one marker per reminder, Meta's limit at the end. */
function Timeline({ steps }) {
  const at = (minutes) => `${Math.min(100, Math.max(0, (minutes / 1440) * 100))}%`;
  return (
    <div className="fu-timeline" aria-hidden="true">
      <div className="fu-track">
        <div className="fu-margin" style={{ left: at(MAX_DELAY) }} />
        {steps.map((step, index) => {
          const delay = Number(step.delay);
          if (!Number.isFinite(delay) || delay <= 0) return null;
          return (
            <div key={step.key} className="fu-marker" style={{ left: at(delay) }}>
              <span className="fu-dot">{index + 1}</span>
              <span className="fu-marker-label">{formatDelay(delay)}</span>
            </div>
          );
        })}
      </div>
      <div className="fu-scale">
        <span>0 h<small>Last message from the agent or your team</small></span>
        <span className="fu-scale-mid">12 h</span>
        <span className="fu-scale-end">24 h<small>Meta's window ends</small></span>
      </div>
    </div>
  );
}

function StepEditor({ step, index, errors, set, onRemove, canRemove }) {
  const id = `fu-${step.key}`;
  const setTime = (hours, minutes) => set('delay', String(Math.max(0, hours) * 60 + Math.max(0, minutes)));
  return (
    <li className="fu-step" data-invalid={Object.keys(errors).length ? 'true' : 'false'}>
      <div className="fu-step-head">
        <span className="fu-step-number">{index + 1}</span>
        <span className="fu-step-title">Reminder {index + 1}</span>
        {canRemove && (
          <button type="button" className="ad-remove" onClick={onRemove} aria-label={`Remove reminder ${index + 1}`}>
            <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Remove
          </button>
        )}
      </div>

      <div className="fu-step-body">
        <div className="ad-field">
          <span className="ad-label" id={`${id}-delay-label`}>Send it after</span>
          <div className="fu-delay" role="group" aria-labelledby={`${id}-delay-label`}>
            <div className={`ad-unit${errors.delay ? ' is-invalid' : ''}`}>
              <input id={`${id}-h`} type="number" min="0" max="23" step="1" inputMode="numeric" value={hoursOf(step.delay)} aria-label="Hours"
                onChange={(e) => setTime(Math.min(23, Number(e.target.value) || 0), minutesOf(step.delay))} />
              <span className="ad-unit-label">h</span>
            </div>
            <div className={`ad-unit${errors.delay ? ' is-invalid' : ''}`}>
              <input id={`${id}-m`} type="number" min="0" max="59" step="5" inputMode="numeric" value={minutesOf(step.delay)} aria-label="Minutes"
                onChange={(e) => setTime(hoursOf(step.delay), Math.min(59, Number(e.target.value) || 0))} />
              <span className="ad-unit-label">min</span>
            </div>
          </div>
          {errors.delay ? <p className="ad-error">{errors.delay}</p> : <p className="ad-hint">Counted from the last message the agent or your team sent, not the customer's.</p>}
        </div>

        <div className="ad-field">
          <span className="ad-label">Text</span>
          <div className="ad-seg" role="radiogroup" aria-label={`Reminder ${index + 1} text`}>
            <button type="button" role="radio" aria-checked={step.mode === 'agent'} onClick={() => set('mode', 'agent')}>The agent writes it</button>
            <button type="button" role="radio" aria-checked={step.mode === 'fixed'} onClick={() => set('mode', 'fixed')}>Use my own text</button>
          </div>
        </div>

        {step.mode === 'fixed' ? (
          <div className="ad-field ad-field-wide">
            <label className="ad-label" htmlFor={`${id}-text`}>Your text</label>
            <textarea id={`${id}-text`} className={`ad-input fu-textarea${errors.fixed_text ? ' is-invalid' : ''}`} rows={3} maxLength={FIXED_TEXT_MAX}
              value={step.fixed_text} placeholder="Hi! Just checking in. Would you like me to keep one for you?" onChange={(e) => set('fixed_text', e.target.value)} />
            <div className="fu-field-foot">
              {errors.fixed_text ? <p className="ad-error">{errors.fixed_text}</p> : <p className="ad-hint">Sent exactly as written. The agent only decides whether to send it. A fixed text never carries a discount.</p>}
              <span className="fu-count">{step.fixed_text.length}/{FIXED_TEXT_MAX}</span>
            </div>
          </div>
        ) : (
          <div className="ad-field ad-field-wide">
            <label className="ad-label" htmlFor={`${id}-note`}>Note for the agent <span className="fu-optional">Optional</span></label>
            <textarea id={`${id}-note`} className={`ad-input fu-textarea${errors.instruction ? ' is-invalid' : ''}`} rows={2} maxLength={INSTRUCTION_MAX}
              value={step.instruction} placeholder="e.g. mention free delivery" onChange={(e) => set('instruction', e.target.value)} />
            <div className="fu-field-foot">
              {errors.instruction ? <p className="ad-error">{errors.instruction}</p> : <p className="ad-hint">The agent writes the reminder from the conversation and keeps this in mind.</p>}
              <span className="fu-count">{step.instruction.length}/{INSTRUCTION_MAX}</span>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * Follow-ups for one agent: reminders to customers who stopped replying, inside Meta's
 * 24-hour window. Saves follow_up_settings through PATCH /v1/agent/update/{agent_id}.
 * @param {{ agent: object, onClose: () => void, onSave: (settings: object) => Promise<void>,
 *   onEditAgent?: () => void, onOpenDiscounts?: () => void }} props
 */
export default function AgentFollowUps({ agent, onClose, onSave, onEditAgent, onOpenDiscounts }) {
  const support = isSupportAgent(agent);
  const initial = useMemo(() => settingsToDraft(agent.follow_up_settings), [agent.follow_up_settings]);
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(draftToSettings(initial)));
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedAt, setSavedAt] = useState(0);
  const panelRef = useRef(null);

  const payload = draftToSettings(draft);
  const payloadJson = JSON.stringify(payload);
  // Saved as null (off) starts from the defaults, switched off: nothing to save until it's turned on.
  const dirty = payloadJson !== baseline;
  const errors = useMemo(() => draftErrors(draft), [draft]);
  const timeZone = agent.agent_timezone || 'UTC';
  const hasDiscounts = (agent.negotiation_rules?.length || 0) + (agent.coupons?.length || 0) > 0;

  const requestClose = () => {
    if (saving) return;
    if (dirty && !window.confirm('Discard your follow-up changes?')) return;
    onClose();
  };
  const closeRef = useRef(requestClose);
  useEffect(() => { closeRef.current = requestClose; });

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    const handleKey = (event) => { if (event.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', handleKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    if (!savedAt) return undefined;
    const timer = setTimeout(() => setSavedAt(0), 2400);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const update = (changes) => {
    setSaveError('');
    setDraft(prev => ({ ...prev, ...changes }));
  };
  const setStep = (stepKey) => (field, value) => {
    setSaveError('');
    setDraft(prev => ({ ...prev, steps: prev.steps.map(step => (step.key === stepKey ? { ...step, [field]: value } : step)) }));
  };
  const addStep = () => setDraft(prev => ({ ...prev, steps: [...prev.steps, stepToDraft({ delay_minutes: nextDelay(prev.steps) })] }));
  const removeStep = (stepKey) => setDraft(prev => ({ ...prev, steps: prev.steps.filter(step => step.key !== stepKey) }));

  const handleSave = async () => {
    if (draft.is_enabled && errors.count) {
      setShowErrors(true);
      setSaveError('Fix the fields marked in red, then save.');
      setTimeout(() => {
        const field = panelRef.current?.querySelector('.ad-unit.is-invalid input, .ad-input.is-invalid');
        field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        field?.focus({ preventScroll: true });
      }, 30);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      // Off with settings that don't pass the checks: save it as off (null), as the backend would read it.
      await onSave(!draft.is_enabled && errors.count ? null : payload);
      setBaseline(payloadJson);
      setShowErrors(false);
      setSavedAt(Date.now());
    } catch (error) {
      setSaveError(error?.message || 'Could not save the follow-ups. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const visibleErrors = showErrors ? errors : { steps: {}, night: null };
  const off = !draft.is_enabled;

  return createPortal(
    <div className="ad-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <div ref={panelRef} className="ad-panel fu-panel" role="dialog" aria-modal="true" aria-labelledby="fu-title" tabIndex={-1}>
        <header className="ad-header">
          <div>
            <h2 id="fu-title" className="ad-title">Follow-ups</h2>
            <p className="ad-subtitle">Short reminders {agent.name || 'this agent'} sends when a customer stops replying, inside Meta's 24-hour window. Each one is a normal message in the inbox.</p>
          </div>
          <button type="button" className="ad-close" onClick={requestClose} aria-label="Close"><X size={18} strokeWidth={1.75} /></button>
        </header>

        <div className="ad-body">
          {support ? (
            <div className="ad-empty">
              <p className="ad-empty-title">Support agents don't send follow-ups</p>
              <p className="ad-empty-text">A customer with a problem shouldn't get reminders. Use a Sales or General agent on a page to follow up with quiet customers.</p>
            </div>
          ) : (
            <>
              <section className="fu-main">
                <div className="fu-main-text">
                  <p className="fu-main-title">Follow up with quiet customers</p>
                  <p className="fu-main-sub">{draft.is_enabled ? 'On. Reminders go out with the rules below.' : 'Off. No reminders are sent.'}</p>
                </div>
                <Switch checked={draft.is_enabled} onChange={(value) => update({ is_enabled: value })} label="Follow up with quiet customers" />
              </section>

              <div className={`fu-settings${off ? ' is-off' : ''}`}>
                <Timeline steps={draft.steps} />

                <div className="fu-section-head">
                  <h3 className="fu-section-title">Reminders</h3>
                  <span className="fu-section-note">Up to {MAX_STEPS}, at least 1 hour apart</span>
                </div>
                <ol className="fu-steps">
                  {draft.steps.map((step, index) => (
                    <StepEditor key={step.key} step={step} index={index} errors={visibleErrors.steps[step.key] || {}}
                      set={setStep(step.key)} onRemove={() => removeStep(step.key)} canRemove={draft.steps.length > 1} />
                  ))}
                </ol>
                {draft.steps.length < MAX_STEPS && (
                  <button type="button" className="ad-add" onClick={addStep} disabled={Number(draft.steps[draft.steps.length - 1]?.delay) + 60 > MAX_DELAY}>
                    <Plus size={15} strokeWidth={2} aria-hidden="true" /> Add reminder
                    {Number(draft.steps[draft.steps.length - 1]?.delay) + 60 > MAX_DELAY && <span className="ad-add-limit">The last one is too late for another</span>}
                  </button>
                )}

                <div className="fu-section-head">
                  <h3 className="fu-section-title"><Moon size={14} strokeWidth={2} aria-hidden="true" /> Night hours</h3>
                  <Switch checked={draft.night_on} onChange={(value) => update({ night_on: value })} label="Night hours" />
                </div>
                {draft.night_on ? (
                  <div className="fu-night">
                    <div className="fu-night-row">
                      <label className="fu-night-field">
                        <span className="ad-label">From</span>
                        <input type="time" className={`ad-input${visibleErrors.night ? ' is-invalid' : ''}`} value={draft.night_start} onChange={(e) => update({ night_start: e.target.value })} />
                      </label>
                      <label className="fu-night-field">
                        <span className="ad-label">To</span>
                        <input type="time" className={`ad-input${visibleErrors.night ? ' is-invalid' : ''}`} value={draft.night_end} onChange={(e) => update({ night_end: e.target.value })} />
                      </label>
                      <div className="fu-night-zone">
                        <span className="ad-label">Timezone</span>
                        <span className="fu-zone">{timeZone}</span>
                      </div>
                    </div>
                    {visibleErrors.night && <p className="ad-error">{visibleErrors.night}</p>}
                    <p className="ad-hint">
                      A reminder due between {draft.night_start || '–'} and {draft.night_end || '–'} ({timeZone}) waits until the night ends. The hours follow the agent's timezone.
                      {onEditAgent && <> <button type="button" className="fu-link" onClick={onEditAgent}>Change the timezone</button></>}
                    </p>
                    {timeZone === 'UTC' && (
                      <p className="fu-warn"><AlertTriangle size={14} aria-hidden="true" /> This agent is on UTC, so these hours may not match your customers' night. Set the agent's timezone to your own.</p>
                    )}
                  </div>
                ) : (
                  <p className="ad-hint fu-night-off">Reminders can go out at any hour.</p>
                )}

                <div className="fu-section-head">
                  <h3 className="fu-section-title"><Tag size={14} strokeWidth={2} aria-hidden="true" /> Use my discounts in follow-ups</h3>
                  <Switch checked={draft.use_discounts} onChange={(value) => update({ use_discounts: value })} label="Use my discounts in follow-ups" />
                </div>
                {hasDiscounts ? (
                  <p className="ad-hint">{draft.use_discounts
                    ? 'The agent may offer a discount or mention a coupon, only from your negotiation rules and coupons.'
                    : 'Reminders never mention a discount or coupon.'}</p>
                ) : (
                  <p className="fu-plain">
                    {agent.name || 'This agent'} has no negotiation rules or coupons, so its follow-ups are plain reminders.
                    {onOpenDiscounts && <> <button type="button" className="fu-link" onClick={onOpenDiscounts}>Set up discounts</button> (starts from a suggested rule).</>}
                  </p>
                )}
              </div>

              <details className="fu-rules">
                <summary><Info size={15} strokeWidth={1.75} aria-hidden="true" /> Rules every follow-up follows <ChevronDown size={15} strokeWidth={1.75} className="fu-rules-chevron" aria-hidden="true" /></summary>
                <div className="fu-rules-body">
                  <p className="fu-rules-head">Who gets one</p>
                  <ul>{WHO_RULES.map(rule => <li key={rule}>{rule}</li>)}</ul>
                  <p className="fu-rules-head">What the agent does</p>
                  <ul>{AGENT_RULES.map(rule => <li key={rule}>{rule}</li>)}</ul>
                </div>
              </details>

              <p className="ad-footnote">A follow-up costs 0.5 credit when it's sent. Nothing is charged when the agent decides not to send one.</p>
            </>
          )}
        </div>

        <footer className="ad-footer">
          <div className="ad-footer-status" aria-live="polite">
            {saveError ? <span className="ad-save-error">{saveError}</span>
              : savedAt ? <SavedBadge className="text-[12.5px]" />
                : dirty ? <span className="ad-unsaved">Unsaved changes</span> : null}
          </div>
          <button type="button" className="ad-button" onClick={requestClose} disabled={saving}>{dirty ? 'Cancel' : 'Close'}</button>
          {!support && <button type="button" className="ad-button ad-button-primary" onClick={handleSave} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save changes'}</button>}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
