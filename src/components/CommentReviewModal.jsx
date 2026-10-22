import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, EyeOff, Loader2, MessageCircle, MessageSquareReply, MessageSquareWarning, Send, Trash2, X } from 'lucide-react';
import { apiService } from '../services/api';
import { COMMENT_CATEGORIES as CATEGORY_LABELS } from '../utils/comments';
import { platformLabel } from '../utils/platforms';

const STATUS_LABELS = {
  pending_review: { label: 'Needs review', className: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Handled by AI', className: 'bg-emerald-50 text-emerald-700' },
  resolved: { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700' },
  dismissed: { label: 'Dismissed', className: 'bg-slate-100 text-slate-600' },
  failed: { label: 'Action failed', className: 'bg-rose-50 text-rose-700' },
};

const DONE_MESSAGES = {
  reply_comment: 'Reply posted on the comment.',
  send_inbox_dm: 'Private message sent.',
  delete_comment: 'Comment deleted.',
  dismiss: 'Marked as reviewed. No action was taken.',
};

// Meta only accepts a private reply to a comment within 7 days of it.
const PRIVATE_REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const REPLY_MAX = 2000;


const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
};

const loadError = (error) => {
  if (error?.status === 404) return 'This comment no longer exists.';
  if (error?.status === 403) return "This comment belongs to a business you're not working in.";
  return error?.message || 'Could not load the comment.';
};

/**
 * Review a comment the AI flagged (a comment_review_needed notification): see the
 * comment, the post and why it was flagged, edit the suggested replies, then reply in
 * public, message the commenter privately, delete the comment or dismiss it.
 */
export default function CommentReviewModal({ commentAnalysisId, canAction = true, onClose }) {
  const [comment, setComment] = useState(null);
  const [loadState, setLoadState] = useState({ id: null, error: '' });
  const [publicReply, setPublicReply] = useState('');
  const [privateMessage, setPrivateMessage] = useState('');
  const [busyAction, setBusyAction] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [result, setResult] = useState(null); // { tone, text }

  useEffect(() => {
    let cancelled = false;
    apiService.getCommentDetail(commentAnalysisId)
      .then(data => {
        if (cancelled) return;
        setComment(data);
        setPublicReply(data?.comment_reply || '');
        setPrivateMessage(data?.inbox_message || '');
        setLoadState({ id: commentAnalysisId, error: '' });
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Failed to load comment:', error);
        setLoadState({ id: commentAnalysisId, error: loadError(error) });
      });
    return () => { cancelled = true; };
  }, [commentAnalysisId]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !busyAction) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busyAction, onClose]);

  const loading = loadState.id !== commentAnalysisId;
  const deleted = Boolean(comment?.is_deleted);
  const ageMs = comment ? Date.now() - Date.parse(comment.created_at) : 0;
  const privateReplyBlocked = deleted
    ? 'The comment was deleted.'
    : comment?.is_private_replied
      ? 'A private message was already sent. Meta allows one per comment.'
      : ageMs > PRIVATE_REPLY_WINDOW_MS
        ? `Meta only allows a private message within 7 days of the comment; this one is ${Math.floor(ageMs / 86400000)} days old.`
        : '';

  const act = async (action, text) => {
    setBusyAction(action);
    setResult(null);
    try {
      const custom = typeof text === 'string' ? text.trim() : '';
      const updated = await apiService.executeCommentAction(commentAnalysisId, action, custom || null);
      if (updated?.id) setComment(updated);
      setResult({ tone: 'success', text: DONE_MESSAGES[action] });
    } catch (error) {
      console.error('Comment action failed:', error);
      setResult({ tone: 'error', text: error?.message || 'That action did not go through. Try again.' });
    } finally {
      setBusyAction(null);
      setConfirmDelete(false);
    }
  };

  const category = CATEGORY_LABELS[comment?.category] || (comment?.category ? { label: comment.category.replace(/_/g, ' '), className: 'bg-slate-100 text-slate-600' } : null);
  const status = STATUS_LABELS[comment?.execution_status];
  const disabled = !canAction || Boolean(busyAction);
  const textareaClass = 'mt-2 block w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition-colors focus:border-emerald-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyAction) onClose(); }}>
      <div className="comment-review-modal flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-fade-in-up" role="dialog" aria-modal="true" aria-labelledby="comment-review-title">
        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <MessageSquareWarning size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="comment-review-title" className="m-0 font-['Epilogue'] text-lg font-black text-slate-900">Comment review</h3>
            <p className="m-0 truncate text-xs font-semibold text-slate-500">
              {comment ? `${platformLabel(comment.platform)}${comment.page_name ? ` · ${comment.page_name}` : ''}${comment.agent_name ? ` · flagged by ${comment.agent_name}` : ''}` : 'Loading'}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={Boolean(busyAction)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-slate-400">
              <Loader2 size={18} className="animate-spin text-emerald-500" /> Loading comment
            </div>
          ) : loadState.error ? (
            <div className="flex flex-col items-center py-14 text-center">
              <Ban size={28} className="mb-3 text-slate-300" />
              <p className="m-0 text-sm font-bold text-slate-600">{loadState.error}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {comment.post_content && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">On the post</p>
                  <p className="m-0 mt-1 line-clamp-3 text-[13px] leading-5 text-slate-600">{comment.post_content}</p>
                </div>
              )}

              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-600">
                  {(comment.commenter_name || '?').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="m-0 text-sm font-black text-slate-900">{comment.commenter_name}</p>
                    <p className="m-0 text-[11px] font-semibold text-slate-400">{formatDate(comment.created_at)}</p>
                  </div>
                  <p className={`m-0 mt-1 whitespace-pre-wrap rounded-2xl rounded-tl-md border px-4 py-2.5 text-[15px] leading-6 ${deleted ? 'border-dashed border-slate-300 italic text-slate-400' : 'border-slate-200 bg-white text-slate-900'}`}>
                    {comment.comment_text}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {category && <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide ${category.className}`}>{category.label}</span>}
                    {status && <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide ${status.className}`}>{status.label}</span>}
                    {deleted && <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-rose-700">Deleted</span>}
                    {comment.is_public_replied && <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">Replied publicly</span>}
                    {comment.is_private_replied && <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">Messaged privately</span>}
                  </div>
                </div>
              </div>

              {comment.reason && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <MessageSquareWarning size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                  <p className="m-0 text-[13px] leading-5 text-amber-900">
                    <strong className="font-black">Why it needs review:</strong> {comment.reason}
                    {Number.isFinite(comment.confidence) && <span className="text-amber-700"> ({Math.round(comment.confidence * 100)}% confident)</span>}
                  </p>
                </div>
              )}

              {!canAction && (
                <p className="m-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-medium text-slate-600">You can view this comment, but your role can't act on it.</p>
              )}

              <section>
                <label htmlFor="comment-public-reply" className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <MessageSquareReply size={15} className="text-slate-400" aria-hidden="true" /> Public reply
                  <span className="font-semibold text-slate-400">· shown under the comment</span>
                </label>
                <textarea
                  id="comment-public-reply"
                  rows={3}
                  maxLength={REPLY_MAX}
                  value={publicReply}
                  onChange={(event) => setPublicReply(event.target.value)}
                  disabled={disabled || deleted}
                  placeholder="Write a public reply, or leave empty to post the AI's suggestion"
                  className={textareaClass}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 text-[11px] font-medium text-slate-400">{deleted ? "Deleted comments can't be replied to." : 'Suggested by the AI. Edit it before posting if you like.'}</p>
                  <button
                    type="button"
                    onClick={() => act('reply_comment', publicReply)}
                    disabled={disabled || deleted}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-black text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyAction === 'reply_comment' ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                    Reply publicly
                  </button>
                </div>
              </section>

              <section>
                <label htmlFor="comment-private-message" className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <Send size={14} className="text-slate-400" aria-hidden="true" /> Private message
                  <span className="font-semibold text-slate-400">· sent to {comment.commenter_name}'s inbox</span>
                </label>
                <textarea
                  id="comment-private-message"
                  rows={3}
                  maxLength={REPLY_MAX}
                  value={privateMessage}
                  onChange={(event) => setPrivateMessage(event.target.value)}
                  disabled={disabled || Boolean(privateReplyBlocked)}
                  placeholder="Write a private message, or leave empty to send the AI's suggestion"
                  className={textareaClass}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className={`m-0 text-[11px] font-medium ${privateReplyBlocked ? 'text-amber-700' : 'text-slate-400'}`}>
                    {privateReplyBlocked || 'Meta allows one private message per comment, within 7 days of it.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => act('send_inbox_dm', privateMessage)}
                    disabled={disabled || Boolean(privateReplyBlocked)}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-solid border-slate-200 bg-white px-3.5 text-xs font-black text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyAction === 'send_inbox_dm' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send privately
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>

        {comment && !loading && !loadState.error && (
          <footer className="border-t border-slate-100 px-5 py-4">
            {result && (
              <p className={`m-0 mb-3 flex items-center gap-1.5 text-[13px] font-bold ${result.tone === 'success' ? 'text-emerald-700' : 'text-rose-600'}`} role={result.tone === 'success' ? 'status' : 'alert'}>
                {result.tone === 'success' && <CheckCircle2 size={15} />}
                {result.text}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-700">Delete it from {platformLabel(comment.platform)}?</span>
                  <button
                    type="button"
                    onClick={() => act('delete_comment')}
                    disabled={disabled}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-black text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                  >
                    {busyAction === 'delete_comment' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} disabled={Boolean(busyAction)} className="h-9 rounded-lg px-3 text-xs font-bold text-slate-500 hover:bg-slate-100">
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={disabled || deleted}
                  className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-black text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={14} /> Delete comment
                </button>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => act('dismiss')}
                  disabled={disabled || comment.execution_status === 'dismissed'}
                  title="Mark as reviewed without replying or deleting"
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-solid border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyAction === 'dismiss' ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
                  Dismiss
                </button>
                <button type="button" onClick={onClose} disabled={Boolean(busyAction)} className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-black text-white transition-colors hover:bg-slate-800">
                  Done
                </button>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
