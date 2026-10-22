import { useState } from 'react';
import { apiService } from '../../services/api';

const NOTE_MAX = 500;
// The backend trims, then counts Unicode characters; `.length` counts an emoji as 2.
const noteLength = (text) => [...text.trim()].length;

const noteErrorMessage = (error) => {
  if (error?.status === 422) return `Notes can be up to ${NOTE_MAX} characters.`;
  if (error?.status === 429) return 'Too many saves for this conversation. Wait a minute, then try again.';
  if (error?.status === 403 || error?.status === 404) return "This conversation can't be edited from here.";
  return error?.message || "The note didn't save. Try again.";
};

/**
 * The team's note about a customer, for the chat's profile panel. Any member can edit
 * it. A note changed elsewhere (live `conversation_update`) replaces the text only
 * while this one isn't being edited.
 * @param {{ pageId: string, conversationId: string, note: string|null, onSaved: (conversation: object) => void }} props
 */
export default function ConversationNote({ pageId, conversationId, note, onSaved }) {
  const saved = note || '';
  const [draft, setDraft] = useState(saved);
  const [base, setBase] = useState(saved);
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const [error, setError] = useState('');

  // Someone else saved: take their text unless there are unsaved edits here.
  if (saved !== base) {
    setBase(saved);
    if (draft === base) setDraft(saved);
  }

  const length = noteLength(draft);
  const tooLong = length > NOTE_MAX;
  const isDirty = draft.trim() !== saved.trim();

  const save = async (text) => {
    setStatus('saving');
    setError('');
    try {
      const updated = await apiService.updateConversationNote(pageId, conversationId, text);
      const next = updated?.note || '';
      setBase(next);
      setDraft(next);
      setStatus('saved');
      onSaved?.(updated || { note: next || null });
    } catch (requestError) {
      setError(noteErrorMessage(requestError));
      setStatus('idle');
    }
  };

  return (
    <section aria-labelledby="conversation-note-heading">
      <h4 id="conversation-note-heading" className="mb-3 border-b border-slate-100 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        Team note
      </h4>
      <textarea
        value={draft}
        onChange={event => { setDraft(event.target.value); setStatus('idle'); }}
        rows={3}
        placeholder="Anything the team should know about this customer"
        aria-label="Team note"
        aria-describedby="conversation-note-help"
        className="block w-full resize-y rounded-lg border border-solid border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      />
      <div id="conversation-note-help" className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className={tooLong ? 'font-semibold text-rose-600' : 'text-slate-400'}>{length}/{NOTE_MAX}</span>
        <span className="flex items-center gap-2">
          {status === 'saved' && !isDirty && <span className="font-semibold text-emerald-700">Saved</span>}
          {saved && (
            <button type="button" onClick={() => save(null)} disabled={status === 'saving'} className="font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50">
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => save(draft)}
            disabled={!isDirty || tooLong || status === 'saving'}
            className="h-7 rounded-md bg-emerald-600 px-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'saving' ? 'Saving…' : 'Save note'}
          </button>
        </span>
      </div>
      {error && <p className="mb-0 mt-1.5 text-[11px] font-semibold text-rose-600" role="alert">{error}</p>}
    </section>
  );
}
