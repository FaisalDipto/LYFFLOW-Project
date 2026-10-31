// The agent form sits in .agent-onboarding-shell, whose dark rules match class
// fragments (bg-red-50, border-emerald-2/3/4…), hover/focus variants included; the
// classes here avoid those fragments.
import { Image as ImageIcon, MessageSquare, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  REPLY_EXAMPLE_LIMITS,
  RESPONSE_FORMAT_MAX,
  exampleProblems,
  newReplyExample,
} from '../utils/agentReplyStyle';

const counterClass = (length, max) => (length > max ? 'text-red-600' : length > max * 0.9 ? 'text-amber-600' : 'text-slate-400');

/**
 * The agent's owner-editable prompt parts: the reply shape (style rules) and reply
 * examples (customer/AI pairs). Only the update endpoint takes them; a reset sends null
 * so the backend restores the role's default.
 * @param {{
 *   format: string, examples: object[], resetFormat: boolean, resetExamples: boolean,
 *   onFormatChange: (text: string) => void, onExamplesChange: (rows: object[]) => void,
 *   onResetFormat: () => void, onResetExamples: () => void, disabled?: boolean,
 *   showErrors?: boolean,
 * }} props  showErrors: after a save attempt, also flag empty fields (length errors always show).
 */
export default function AgentReplyStyle({
  format, examples, resetFormat, resetExamples,
  onFormatChange, onExamplesChange, onResetFormat, onResetExamples, disabled = false, showErrors = false,
}) {
  const allProblems = exampleProblems(examples);
  const shown = (message) => (message && (showErrors || !message.startsWith('Write')) ? message : undefined);
  const problems = Object.fromEntries(Object.entries(allProblems)
    .filter(([key]) => key !== '_list')
    .map(([key, entry]) => [key, { customer: shown(entry.customer), reply: shown(entry.reply) }]));
  const hasImage = examples.some(row => row.kind === 'image');
  const full = examples.length >= REPLY_EXAMPLE_LIMITS.maxItems;
  const update = (key, changes) => onExamplesChange(examples.map(row => (row.key === key ? { ...row, ...changes } : row)));

  return (
    <section aria-labelledby="agent-reply-style-title" className="agent-reply-style rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <h3 id="agent-reply-style-title" className="m-0 text-[15px] font-bold text-slate-900">Reply style</h3>
      <p className="mb-0 mt-1 text-xs leading-5 text-slate-500">
        How this agent's replies look. Examples teach shape and length only: prices and facts in them are placeholders, and the agent always takes those from your knowledge base.
      </p>

      {/* Reply shape */}
      <div className="mt-4">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="agent-response-format" className="text-sm font-semibold text-slate-800">Reply shape</label>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold tabular-nums ${counterClass(format.length, RESPONSE_FORMAT_MAX)}`}>{format.length.toLocaleString()}/{RESPONSE_FORMAT_MAX.toLocaleString()}</span>
            <button type="button" onClick={onResetFormat} disabled={disabled || resetFormat} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-50">
              <RotateCcw size={12} aria-hidden="true" /> Reset to default
            </button>
          </div>
        </div>
        <textarea
          id="agent-response-format"
          rows={4}
          maxLength={RESPONSE_FORMAT_MAX}
          value={format}
          onChange={event => onFormatChange(event.target.value)}
          disabled={disabled}
          placeholder="e.g. Short sentences. No emoji. One call to action per reply."
          aria-describedby="agent-response-format-help"
          className="block w-full resize-y rounded-xl border border-solid border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <p id="agent-response-format-help" className={`mb-0 mt-1 text-[11px] ${resetFormat ? 'font-semibold text-emerald-700' : 'text-slate-500'}`}>
          {resetFormat
            ? "The role's default will be restored when you save."
            : 'Style rules: length, emoji, greeting, how to ask for the order. Leave empty to use the default.'}
        </p>
      </div>

      {/* Examples */}
      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <p className="m-0 text-sm font-semibold text-slate-800">
            Examples <span className="font-normal text-slate-400">({examples.length}/{REPLY_EXAMPLE_LIMITS.maxItems})</span>
          </p>
          <button type="button" onClick={onResetExamples} disabled={disabled || resetExamples} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-50">
            <RotateCcw size={12} aria-hidden="true" /> Reset to default
          </button>
        </div>

        {resetExamples ? (
          <p className="m-0 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-3 py-3 text-xs font-semibold text-emerald-700">
            The role's default examples will be restored when you save.
          </p>
        ) : examples.length === 0 ? (
          <p className="m-0 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500">
            No examples. Saving with none restores the role's default examples.
          </p>
        ) : (
          <ol className="m-0 list-none space-y-2.5 p-0">
            {examples.map((row, index) => {
              const rowProblems = problems[row.key] || {};
              const customerId = `agent-example-${index}-customer`;
              const replyId = `agent-example-${index}-reply`;
              return (
                <li key={row.key} className="agent-reply-example rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Example {index + 1}{row.kind === 'image' ? ' · photo' : ''}</span>
                    <button type="button" onClick={() => onExamplesChange(examples.filter(item => item.key !== row.key))} disabled={disabled} aria-label={`Remove example ${index + 1}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-50">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-[4.5rem_1fr] items-start gap-x-2 gap-y-2">
                    <label htmlFor={customerId} className="pt-2 text-xs font-bold text-slate-500">Customer</label>
                    {row.kind === 'image' ? (
                      <p id={customerId} className="m-0 flex items-start gap-1.5 rounded-lg bg-slate-100 px-2.5 py-2 text-xs italic leading-5 text-slate-600">
                        <ImageIcon size={14} className="mt-0.5 shrink-0 not-italic" aria-hidden="true" />
                        {row.customer_message || "Sends a photo. The role's photo description is filled in when you save."}
                      </p>
                    ) : (
                      <div>
                        <input
                          id={customerId}
                          type="text"
                          maxLength={REPLY_EXAMPLE_LIMITS.customer}
                          value={row.customer_message}
                          onChange={event => update(row.key, { customer_message: event.target.value })}
                          disabled={disabled}
                          placeholder="What the customer writes"
                          aria-invalid={rowProblems.customer ? 'true' : undefined}
                          className={`block w-full rounded-lg border border-solid bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:ring-2 ${rowProblems.customer ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'}`}
                        />
                        <p className={`mb-0 mt-0.5 text-right text-[10px] font-semibold tabular-nums ${rowProblems.customer ? 'text-red-600' : counterClass(row.customer_message.length, REPLY_EXAMPLE_LIMITS.customer)}`}>
                          {rowProblems.customer || `${row.customer_message.length}/${REPLY_EXAMPLE_LIMITS.customer}`}
                        </p>
                      </div>
                    )}

                    <label htmlFor={replyId} className="pt-2 text-xs font-bold text-emerald-700">AI</label>
                    <div>
                      <textarea
                        id={replyId}
                        rows={2}
                        maxLength={REPLY_EXAMPLE_LIMITS.reply}
                        value={row.agent_reply}
                        onChange={event => update(row.key, { agent_reply: event.target.value })}
                        disabled={disabled}
                        placeholder="How the agent should reply, as a plain sentence"
                        aria-invalid={rowProblems.reply ? 'true' : undefined}
                        className={`block w-full resize-y rounded-lg border border-solid bg-white px-2.5 py-1.5 text-sm leading-5 text-slate-800 outline-none focus:ring-2 ${rowProblems.reply ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'}`}
                      />
                      <p className={`mb-0 mt-0.5 text-right text-[10px] font-semibold tabular-nums ${rowProblems.reply ? 'text-red-600' : counterClass(row.agent_reply.length, REPLY_EXAMPLE_LIMITS.reply)}`}>
                        {rowProblems.reply || `${row.agent_reply.length}/${REPLY_EXAMPLE_LIMITS.reply}`}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {!resetExamples && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onExamplesChange([...examples, newReplyExample('text')])} disabled={disabled || full} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-solid border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50">
              <Plus size={13} aria-hidden="true" /><MessageSquare size={13} aria-hidden="true" /> Add text example
            </button>
            <button type="button" onClick={() => onExamplesChange([...examples, newReplyExample('image')])} disabled={disabled || full || hasImage} title={hasImage ? 'Only one photo example is allowed' : undefined} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-solid border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50">
              <Plus size={13} aria-hidden="true" /><ImageIcon size={13} aria-hidden="true" /> Add photo example
            </button>
            {full && <span className="self-center text-[11px] text-slate-500">Up to {REPLY_EXAMPLE_LIMITS.maxItems} examples.</span>}
          </div>
        )}
        {allProblems._list && <p role="alert" className="mb-0 mt-2 text-xs font-semibold text-red-600">{allProblems._list}</p>}
      </div>
    </section>
  );
}
