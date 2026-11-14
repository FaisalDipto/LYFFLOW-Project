import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Info, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { apiService } from '../../services/api';
import SavedBadge from '../SavedBadge';
import {
  MAX_COUPONS, MAX_RULES, NAME_MAX, SCOPES, SCOPE_LIST,
  couponErrors, couponStatus, couponToDraft, couponToPayload, describeCouponDiscount, describeCoverage,
  describeRuleDiscount, formatDay, ruleErrors, ruleToDraft, ruleToPayload,
} from '../../utils/discounts';
import './AgentDiscounts.css';

const STATUS_LABELS = { active: 'Active', scheduled: 'Scheduled', ended: 'Ended' };

const Field = ({ label, hint, error, htmlFor, children, wide = false }) => (
  <div className={`ad-field${wide ? ' ad-field-wide' : ''}`}>
    <label className="ad-label" htmlFor={htmlFor}>{label}</label>
    {children}
    {error ? <p className="ad-error">{error}</p> : hint ? <p className="ad-hint">{hint}</p> : null}
  </div>
);

// A number input with the unit beside it ("BDT" before, "%" after).
const UnitInput = ({ id, value, onChange, unit, unitAfter = false, invalid, placeholder, step = '0.01' }) => (
  <div className={`ad-unit${invalid ? ' is-invalid' : ''}`}>
    {!unitAfter && unit && <span className="ad-unit-label">{unit}</span>}
    <input id={id} type="number" inputMode="decimal" min="0" step={step} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    {unitAfter && unit && <span className="ad-unit-label">{unit}</span>}
  </div>
);

const Segmented = ({ value, options, onChange, label }) => (
  <div className="ad-seg" role="radiogroup" aria-label={label}>
    {options.map(option => (
      <button key={option.value} type="button" role="radio" aria-checked={value === option.value} disabled={option.disabled} title={option.title} onClick={() => onChange(option.value)}>
        {option.label}
      </button>
    ))}
  </div>
);

// What a rule or coupon covers: scope, its list, price band, quantity, order subtotal.
function CoverageFields({ draft, errors, set, idPrefix, currency, subtotalAnyScope, lockWholeOrder }) {
  const list = SCOPE_LIST[draft.scope];
  const isOrder = draft.scope === 'whole_order';
  return (
    <>
      <Field label="Applies to" htmlFor={`${idPrefix}-scope`} error={errors.scope}>
        <select id={`${idPrefix}-scope`} className="ad-input" value={draft.scope} onChange={(e) => set('scope', e.target.value)} disabled={lockWholeOrder}>
          {SCOPES.map(scope => <option key={scope.value} value={scope.value}>{scope.label}</option>)}
        </select>
      </Field>
      {list && (
        <Field label={list.label} htmlFor={`${idPrefix}-list`} error={errors[list.field]} hint="Separate with commas. Not case-sensitive.">
          <input id={`${idPrefix}-list`} className={`ad-input${errors[list.field] ? ' is-invalid' : ''}`} value={draft[list.field]} placeholder={list.placeholder} onChange={(e) => set(list.field, e.target.value)} spellCheck={false} />
        </Field>
      )}
      {!isOrder && (
        <>
          <Field label="Unit price from" htmlFor={`${idPrefix}-min`} error={errors.min_unit_price} hint="Optional. Catalog price, inclusive.">
            <UnitInput id={`${idPrefix}-min`} unit={currency} value={draft.min_unit_price} onChange={(v) => set('min_unit_price', v)} invalid={errors.min_unit_price} placeholder="Any" />
          </Field>
          <Field label="Unit price under" htmlFor={`${idPrefix}-max`} error={errors.max_unit_price} hint="Optional.">
            <UnitInput id={`${idPrefix}-max`} unit={currency} value={draft.max_unit_price} onChange={(v) => set('max_unit_price', v)} invalid={errors.max_unit_price} placeholder="Any" />
          </Field>
          <Field label="Minimum pieces" htmlFor={`${idPrefix}-qty`} error={errors.min_quantity} hint="Only when the customer takes at least this many.">
            <input id={`${idPrefix}-qty`} type="number" min="1" step="1" className={`ad-input${errors.min_quantity ? ' is-invalid' : ''}`} value={draft.min_quantity} placeholder="1" onChange={(e) => set('min_quantity', e.target.value)} />
          </Field>
        </>
      )}
      {(isOrder || subtotalAnyScope) && (
        <Field label="Minimum order subtotal" htmlFor={`${idPrefix}-subtotal`} error={errors.min_order_subtotal} hint={isOrder ? 'Optional. Catalog subtotal of the order.' : 'Optional. Catalog subtotal of the covered items.'}>
          <UnitInput id={`${idPrefix}-subtotal`} unit={currency} value={draft.min_order_subtotal} onChange={(v) => set('min_order_subtotal', v)} invalid={errors.min_order_subtotal} placeholder="None" />
        </Field>
      )}
    </>
  );
}

function RuleEditor({ draft, errors, set, currency, onRemove }) {
  const id = `ad-${draft.key}`;
  const isPercent = draft.discount_kind === 'percent';
  const isOrder = draft.scope === 'whole_order';
  const unit = isPercent ? '%' : currency;
  return (
    <div className="ad-editor">
      <div className="ad-grid">
        <Field label="Rule name" htmlFor={`${id}-name`} error={errors.name} hint="Only you see this." wide>
          <input id={`${id}-name`} className={`ad-input${errors.name ? ' is-invalid' : ''}`} value={draft.name} maxLength={NAME_MAX} placeholder="e.g. Sarees" onChange={(e) => set('name', e.target.value)} />
        </Field>
        <CoverageFields draft={draft} errors={errors} set={set} idPrefix={id} currency={currency} subtotalAnyScope={false} />
      </div>

      <div className="ad-subhead">Discount</div>
      <div className="ad-grid">
        <Field label="Counted as" wide>
          <Segmented
            label="Discount unit"
            value={draft.discount_kind}
            onChange={(v) => set('discount_kind', v)}
            options={[
              { value: 'amount', label: isOrder ? `${currency} per order` : `${currency} per piece` },
              { value: 'percent', label: isOrder ? '% of the order' : '% of the price' },
            ]}
          />
        </Field>
        <Field label="First offer" htmlFor={`${id}-first`} error={errors.first_offer} hint="The agent opens at or below this.">
          <UnitInput id={`${id}-first`} unit={unit} unitAfter={isPercent} value={draft.first_offer} onChange={(v) => set('first_offer', v)} invalid={errors.first_offer} placeholder="0" />
        </Field>
        <Field label="Maximum" htmlFor={`${id}-max-discount`} error={errors.max_discount} hint="Never more, after one push-back.">
          <UnitInput id={`${id}-max-discount`} unit={unit} unitAfter={isPercent} value={draft.max_discount} onChange={(v) => set('max_discount', v)} invalid={errors.max_discount} />
        </Field>
        {isPercent && (
          <Field label="Up to" htmlFor={`${id}-cap`} error={errors.max_discount_amount} hint={`Optional cap in ${currency}, e.g. 10% up to 300.`}>
            <UnitInput id={`${id}-cap`} unit={currency} value={draft.max_discount_amount} onChange={(v) => set('max_discount_amount', v)} invalid={errors.max_discount_amount} placeholder="No cap" />
          </Field>
        )}
      </div>

      <div className="ad-editor-foot">
        <button type="button" className="ad-remove" onClick={onRemove}><Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Remove rule</button>
      </div>
    </div>
  );
}

function CouponEditor({ draft, errors, set, currency, onRemove }) {
  const id = `ad-${draft.key}`;
  const kind = draft.discount_kind;
  const isFree = kind === 'free_delivery';
  const setKind = (value) => {
    set('discount_kind', value);
    if (value === 'free_delivery') set('scope', 'whole_order');
  };
  return (
    <div className="ad-editor">
      <div className="ad-grid">
        <Field label="Coupon name" htmlFor={`${id}-name`} error={errors.name} hint="Customers see this name." wide>
          <input id={`${id}-name`} className={`ad-input${errors.name ? ' is-invalid' : ''}`} value={draft.name} maxLength={NAME_MAX} placeholder="e.g. Eid 10%" onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Starts" htmlFor={`${id}-start`} error={errors.starts_on}>
          <input id={`${id}-start`} type="date" className={`ad-input${errors.starts_on ? ' is-invalid' : ''}`} value={draft.starts_on} onChange={(e) => set('starts_on', e.target.value)} />
        </Field>
        <Field label="Ends" htmlFor={`${id}-end`} error={errors.ends_on} hint="Inclusive, in the agent's timezone.">
          <input id={`${id}-end`} type="date" className={`ad-input${errors.ends_on ? ' is-invalid' : ''}`} value={draft.ends_on} min={draft.starts_on || undefined} onChange={(e) => set('ends_on', e.target.value)} />
        </Field>
      </div>

      <div className="ad-subhead">Discount</div>
      <div className="ad-grid">
        <Field label="Type" wide>
          <Segmented
            label="Coupon type"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'percent', label: 'Percent off' },
              { value: 'amount', label: `${currency} off` },
              { value: 'free_delivery', label: 'Free delivery' },
            ]}
          />
        </Field>
        {!isFree && (
          <Field label={kind === 'percent' ? 'Percent off' : draft.scope === 'whole_order' ? 'Off the order' : 'Off each piece'} htmlFor={`${id}-value`} error={errors.discount_value}>
            <UnitInput id={`${id}-value`} unit={kind === 'percent' ? '%' : currency} unitAfter={kind === 'percent'} value={draft.discount_value} onChange={(v) => set('discount_value', v)} invalid={errors.discount_value} />
          </Field>
        )}
        {kind === 'percent' && (
          <Field label="Up to" htmlFor={`${id}-cap`} error={errors.max_discount_amount} hint={`Optional cap in ${currency}.`}>
            <UnitInput id={`${id}-cap`} unit={currency} value={draft.max_discount_amount} onChange={(v) => set('max_discount_amount', v)} invalid={errors.max_discount_amount} placeholder="No cap" />
          </Field>
        )}
      </div>

      <div className="ad-subhead">Who gets it</div>
      <div className="ad-grid">
        <CoverageFields draft={draft} errors={errors} set={set} idPrefix={id} currency={currency} subtotalAnyScope lockWholeOrder={isFree} />
        {isFree && <p className="ad-hint ad-field-wide">Free delivery always covers the whole order. Set a minimum subtotal to offer it only above an amount.</p>}
      </div>

      <div className="ad-editor-foot">
        <button type="button" className="ad-remove" onClick={onRemove}><Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Remove coupon</button>
      </div>
    </div>
  );
}

// The "## Discounts" part of the agent's prompt (up to the next "## " heading), or null.
const discountsSection = (prompt) => {
  const match = /^##\s*Discounts\b[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m.exec(prompt || '');
  return match ? match[0].trim() : null;
};
// The endpoint's text, whichever key it comes under.
const promptText = (response) => {
  if (typeof response === 'string') return response;
  const value = response?.prompt ?? response?.system_prompt ?? response?.preview ?? response?.text;
  return typeof value === 'string' ? value : JSON.stringify(response, null, 2);
};

/** What the agent is told, from GET /v1/agent/{id}/prompt-preview (saved settings only). */
function PromptPreview({ agentId, reloadKey, dirty }) {
  const [state, setState] = useState({ status: 'loading', prompt: '', error: '' });
  const [showFull, setShowFull] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiService.getAgentPromptPreview(agentId)
      .then(response => { if (!cancelled) setState({ status: 'ready', prompt: promptText(response), error: '' }); })
      .catch(error => { if (!cancelled) setState({ status: 'error', prompt: '', error: error?.message || 'Could not load the preview.' }); });
    return () => { cancelled = true; };
  }, [agentId, reloadKey, attempt]);

  const reload = () => {
    setState(prev => ({ ...prev, status: 'loading' }));
    setAttempt(value => value + 1);
  };
  const section = discountsSection(state.prompt);

  return (
    <div className="ad-preview">
      <div className="ad-preview-bar">
        <p className="ad-preview-caption">
          {dirty ? 'Showing the saved settings. Save to see your changes here.' : 'The discount instructions the agent gets, built from the saved settings.'}
        </p>
        <button type="button" className="ad-preview-reload" onClick={reload} disabled={state.status === 'loading'} aria-label="Reload preview">
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      {state.status === 'loading' ? (
        <div className="ad-preview-empty"><Loader2 size={16} className="ad-spin" aria-hidden="true" /> Loading preview…</div>
      ) : state.status === 'error' ? (
        <div className="ad-preview-empty ad-preview-error">{state.error}</div>
      ) : (
        <>
          {section
            ? <pre className="ad-pre">{section}</pre>
            : <div className="ad-preview-empty">No discount instructions: without rules or coupons the agent holds the listed price and has no discount tool.</div>}
          <button type="button" className="ad-preview-toggle" onClick={() => setShowFull(value => !value)} aria-expanded={showFull}>
            {showFull ? 'Hide the full prompt' : 'Show the full prompt'}
            <ChevronDown size={14} strokeWidth={1.75} className={showFull ? 'ad-rot' : ''} aria-hidden="true" />
          </button>
          {showFull && <pre className="ad-pre ad-pre-full">{state.prompt}</pre>}
        </>
      )}
    </div>
  );
}

const rulesPayload = (rules) => rules.map(ruleToPayload);
const couponsPayload = (coupons) => coupons.map(couponToPayload);

/**
 * Discounts for one agent: negotiation rules (hidden from customers) and coupons.
 * Saves both lists through PATCH /v1/agent/update/{agent_id}.
 * `suggestedRule` (the agent's suggested_negotiation_rule) starts an agent with no rules
 * and no coupons from that rule, unsaved: nothing is stored until the owner saves.
 * @param {{ agent: object, currency: string, onClose: () => void,
 *   onSave: (changes: object) => Promise<object|void>, suggestedRule?: object|null }} props
 */
export default function AgentDiscounts({ agent, currency = 'BDT', onClose, onSave, suggestedRule = null }) {
  const timeZone = agent.agent_timezone;
  const initial = useMemo(() => ({
    rules: (agent.negotiation_rules || []).map(ruleToDraft),
    coupons: (agent.coupons || []).map(coupon => couponToDraft(coupon, timeZone)),
  }), [agent, timeZone]);
  const [suggested] = useState(() => (
    suggestedRule && !initial.rules.length && !initial.coupons.length ? ruleToDraft(suggestedRule) : null
  ));
  const [tab, setTab] = useState('rules');
  const [rules, setRules] = useState(suggested ? [suggested] : initial.rules);
  const [coupons, setCoupons] = useState(initial.coupons);
  const [openKey, setOpenKey] = useState(suggested?.key ?? null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedAt, setSavedAt] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  const [baseline, setBaseline] = useState(() => ({
    rules: JSON.stringify(rulesPayload(initial.rules)),
    coupons: JSON.stringify(couponsPayload(initial.coupons)),
  }));
  const panelRef = useRef(null);

  const rulesJson = JSON.stringify(rulesPayload(rules));
  const couponsJson = JSON.stringify(couponsPayload(coupons));
  const rulesChanged = rulesJson !== baseline.rules;
  const couponsChanged = couponsJson !== baseline.coupons;
  const dirty = rulesChanged || couponsChanged;

  const ruleErrorMap = useMemo(() => Object.fromEntries(rules.map(rule => [rule.key, ruleErrors(rule)])), [rules]);
  const couponErrorMap = useMemo(() => Object.fromEntries(coupons.map(coupon => [coupon.key, couponErrors(coupon)])), [coupons]);
  const hasErrors = (map) => Object.values(map).some(errors => Object.keys(errors).length > 0);

  const requestClose = () => {
    if (saving) return;
    if (dirty && !window.confirm('Discard your discount changes?')) return;
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

  const updateItem = (setter) => (key) => (field, value) => {
    setSaveError('');
    setter(prev => prev.map(item => (item.key === key ? { ...item, [field]: value } : item)));
  };
  const setRuleField = updateItem(setRules);
  const setCouponField = updateItem(setCoupons);

  const addRule = () => {
    const draft = ruleToDraft();
    setRules(prev => [...prev, draft]);
    setOpenKey(draft.key);
  };
  const addCoupon = () => {
    const draft = couponToDraft({}, timeZone);
    setCoupons(prev => [...prev, draft]);
    setOpenKey(draft.key);
  };
  const remove = (setter, key) => {
    setter(prev => prev.filter(item => item.key !== key));
    setSaveError('');
    if (openKey === key) setOpenKey(null);
  };

  const handleSave = async () => {
    if (hasErrors(ruleErrorMap) || hasErrors(couponErrorMap)) {
      setShowErrors(true);
      const badRule = rules.find(rule => Object.keys(ruleErrorMap[rule.key]).length);
      const badCoupon = coupons.find(coupon => Object.keys(couponErrorMap[coupon.key]).length);
      const target = (tab === 'coupons' ? badCoupon || badRule : badRule || badCoupon);
      if (target) {
        setTab(target === badRule ? 'rules' : 'coupons');
        setOpenKey(target.key);
      }
      setSaveError('Fix the fields marked in red, then save.');
      // After the item opens, bring its first bad field into view.
      setTimeout(() => {
        const field = panelRef.current?.querySelector('.ad-unit.is-invalid input, .ad-input.is-invalid');
        field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        field?.focus({ preventScroll: true });
      }, 60);
      return;
    }
    const changes = {};
    if (rulesChanged) changes.negotiation_rules = JSON.parse(rulesJson);
    if (couponsChanged) changes.coupons = JSON.parse(couponsJson);
    setSaving(true);
    setSaveError('');
    try {
      await onSave(changes);
      setBaseline({ rules: rulesJson, coupons: couponsJson });
      setShowErrors(false);
      setSavedAt(Date.now());
      setSavedVersion(value => value + 1);
    } catch (error) {
      setSaveError(error?.message || 'Could not save the discounts. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = (item, kind) => {
    const isRule = kind === 'rule';
    const errors = (isRule ? ruleErrorMap : couponErrorMap)[item.key] || {};
    const invalid = showErrors && Object.keys(errors).length > 0;
    const open = openKey === item.key;
    const status = isRule ? null : couponStatus(item, timeZone);
    const summary = isRule
      ? `${describeCoverage(item, currency)} · ${describeRuleDiscount(item, currency)}`
      : `${describeCouponDiscount(item, currency)} · ${describeCoverage(item, currency)}`;
    return (
      <li key={item.key} className="ad-item" data-open={open ? 'true' : 'false'} data-invalid={invalid ? 'true' : 'false'}>
        <button type="button" className="ad-item-head" aria-expanded={open} onClick={() => setOpenKey(open ? null : item.key)}>
          <span className="ad-item-text">
            <span className="ad-item-title">
              <span className="ad-item-name">{item.name.trim() || (isRule ? 'New rule' : 'New coupon')}</span>
              {status && <span className={`ad-status ad-status-${status}`}>{STATUS_LABELS[status]}</span>}
              {invalid && <span className="ad-status ad-status-error">Needs a fix</span>}
            </span>
            <span className="ad-item-summary">{summary}</span>
            {!isRule && (
              <span className="ad-item-dates">
                {formatDay(item.starts_on)} – {formatDay(item.ends_on)}
                {status === 'ended' && ' · Customers who mention it hear it ended. Remove it to stop that.'}
              </span>
            )}
          </span>
          <ChevronDown size={16} strokeWidth={1.75} className="ad-chevron" aria-hidden="true" />
        </button>
        {open && (isRule
          ? <RuleEditor draft={item} errors={showErrors ? errors : {}} set={setRuleField(item.key)} currency={currency} onRemove={() => remove(setRules, item.key)} />
          : <CouponEditor draft={item} errors={showErrors ? errors : {}} set={setCouponField(item.key)} currency={currency} onRemove={() => remove(setCoupons, item.key)} />)}
      </li>
    );
  };

  const isRules = tab === 'rules';
  const isPreview = tab === 'preview';
  const items = isRules ? rules : coupons;
  const atLimit = isRules ? rules.length >= MAX_RULES : coupons.length >= MAX_COUPONS;
  const activeCoupons = coupons.filter(coupon => couponStatus(coupon, timeZone) === 'active').length;

  return createPortal(
    <div className="ad-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <div ref={panelRef} className="ad-panel" role="dialog" aria-modal="true" aria-labelledby="ad-title" tabIndex={-1}>
        <header className="ad-header">
          <div>
            <h2 id="ad-title" className="ad-title">Discounts</h2>
            <p className="ad-subtitle">What {agent.name || 'this agent'} may take off when a customer asks for a better price. Every order is checked against these limits.</p>
          </div>
          <button type="button" className="ad-close" onClick={requestClose} aria-label="Close"><X size={18} strokeWidth={1.75} /></button>
        </header>

        <div className="ad-tabs" role="tablist" aria-label="Discount settings">
          <button type="button" role="tab" aria-selected={isRules} onClick={() => setTab('rules')}>
            Negotiation rules <span className="ad-count">{rules.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'coupons'} onClick={() => setTab('coupons')}>
            Coupons <span className="ad-count">{coupons.length}</span>
            {activeCoupons > 0 && <span className="ad-live-dot" title={`${activeCoupons} active today`} />}
          </button>
          <button type="button" role="tab" aria-selected={isPreview} onClick={() => setTab('preview')} className="ad-tab-end">
            Agent preview
          </button>
        </div>

        <div className="ad-body">
          {isPreview ? <PromptPreview agentId={agent.agent_id} reloadKey={savedVersion} dirty={dirty} /> : <>
          {isRules && suggested && rules.some(rule => rule.key === suggested.key) && rulesChanged && (
            <div className="ad-note ad-note-suggested">
              <Info size={15} strokeWidth={1.75} aria-hidden="true" />
              <p>A suggested rule to start from: {describeRuleDiscount(suggested, currency)} on all products. Change it if you like (for example to a fixed amount in {currency}), then save to turn it on.</p>
            </div>
          )}
          <div className="ad-note">
            <Info size={15} strokeWidth={1.75} aria-hidden="true" />
            {isRules ? (
              <p>
                Never shown to customers. The agent gives the price first and offers a discount only when asked: it opens at or below the first offer and moves toward the maximum after one push-back.
                {' '}When several rules match, the most specific wins (a product's own limit, then specific products, then categories or tags, then all products), and the smallest maximum breaks a tie. Whole-order rules also cap the order's total discount.
              </p>
            ) : (
              <p>
                The agent may mention active coupons before the customer asks. One money coupon per order, whichever saves the customer most, plus free delivery if one applies. A coupon is the whole discount on the items it covers: no bargaining on top.
              </p>
            )}
          </div>

          {items.length === 0 ? (
            <div className="ad-empty">
              <p className="ad-empty-title">{isRules ? 'No negotiation' : 'No coupons'}</p>
              <p className="ad-empty-text">
                {isRules
                  ? 'Without rules the agent holds the listed price. Add a rule to let it bargain within limits you set.'
                  : 'Add a dated offer, like 10% off for Eid or free delivery over a set amount.'}
              </p>
            </div>
          ) : (
            <ul className="ad-list">{items.map(item => renderItem(item, isRules ? 'rule' : 'coupon'))}</ul>
          )}

          <button type="button" className="ad-add" onClick={isRules ? addRule : addCoupon} disabled={atLimit}>
            <Plus size={15} strokeWidth={2} aria-hidden="true" />
            {isRules ? 'Add rule' : 'Add coupon'}
            {atLimit && <span className="ad-add-limit">{isRules ? `Up to ${MAX_RULES}` : `Up to ${MAX_COUPONS}`}</span>}
          </button>
          <p className="ad-footnote">Discounts apply to the current selling price (the sale price when set) and never go below a product's cost price. Limits set on a product win over these rules.</p>
          </>}
        </div>

        <footer className="ad-footer">
          <div className="ad-footer-status" aria-live="polite">
            {saveError ? <span className="ad-save-error">{saveError}</span>
              : savedAt ? <SavedBadge className="text-[12.5px]" />
                : dirty ? <span className="ad-unsaved">Unsaved changes</span> : null}
          </div>
          <button type="button" className="ad-button" onClick={requestClose} disabled={saving}>{dirty ? 'Cancel' : 'Close'}</button>
          <button type="button" className="ad-button ad-button-primary" onClick={handleSave} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save changes'}</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
