import { useEffect, useState } from 'react';
import { AlertTriangle, Brush, Loader2, X } from 'lucide-react';
import { apiService } from '../../services/api';
import { cleanupErrorCode, cleanupErrorText, formatCount, formatCredits, formatDateTime, formatFromNow } from '../../utils/commentCleanup';

/**
 * Confirm a cleanup of the chosen posts: shows the estimate (an upper bound; only
 * classified comments are charged), asks the owner what to do with support issues, then
 * starts the runs. `onStarted({ runs, estimated_finish_at })` fires on success.
 * `onAction(code)` handles the error's follow-up (reconnect, agents, subscription).
 */
export default function CleanupDialog({ pageId, posts, onClose, onStarted, onAction }) {
  const [estimate, setEstimate] = useState(null);
  const [estimateError, setEstimateError] = useState(null);
  const [deleteSupport, setDeleteSupport] = useState(null); // null until the owner chooses
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const postIds = posts.map(post => post.post_id);
  const postKey = postIds.join(',');

  useEffect(() => {
    let cancelled = false;
    apiService.estimateCommentCleanup(pageId, postKey.split(','))
      .then(data => { if (!cancelled) setEstimate(data); })
      .catch(error => { if (!cancelled) setEstimateError(error); });
    return () => { cancelled = true; };
  }, [pageId, postKey]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !starting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, starting]);

  const start = async () => {
    if (deleteSupport === null || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const result = await apiService.startCommentCleanup(pageId, postIds, deleteSupport);
      onStarted(result);
    } catch (error) {
      setStartError(error);
      setStarting(false);
    }
  };

  const free = estimate && Number(estimate.price_per_comment) === 0;
  const overBudget = estimate && !free && Number(estimate.total_credits) > Number(estimate.credits_remaining);
  const textOf = (postId) => posts.find(post => post.post_id === postId)?.text || postId;
  const shownError = startError || estimateError;
  const errorCode = cleanupErrorCode(shownError);
  const followUp = {
    page_reconnect_required: 'Reconnect page',
    page_has_no_agent: 'Go to Agents',
    subscription_required: 'See plans',
  }[errorCode];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in" onMouseDown={(event) => { if (event.target === event.currentTarget && !starting) onClose(); }}>
      <div className="comment-cleanup-dialog flex max-h-[min(92vh,820px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-fade-in-up" role="dialog" aria-modal="true" aria-labelledby="cleanup-dialog-title">
        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Brush size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="cleanup-dialog-title" className="m-0 font-['Epilogue'] text-lg font-black text-slate-900">Clean up comments</h3>
            <p className="m-0 truncate text-xs font-semibold text-slate-500">{posts.length === 1 ? textOf(postIds[0]) : `${posts.length} posts`}</p>
          </div>
          <button type="button" onClick={onClose} disabled={starting} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <p className="m-0 text-[13px] leading-5 text-slate-600">
            The page's agent reads every comment already on {posts.length === 1 ? 'this post' : 'these posts'} and removes spam, scams, abuse and competitor promotion.
            Anything it isn't sure about goes to your review list.
          </p>

          {!estimate && !estimateError && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500">
              <Loader2 size={16} className="animate-spin text-emerald-500" /> Counting comments
            </div>
          )}

          {estimate && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Comments</p>
                  <p className="m-0 mt-0.5 text-lg font-black tabular-nums text-slate-900">up to {formatCount(estimate.total_comments)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Cost</p>
                  <p className="m-0 mt-0.5 text-lg font-black tabular-nums text-slate-900">{free ? 'Free' : `up to ${formatCredits(estimate.total_credits)}`}</p>
                  {!free && <p className="m-0 text-[11px] font-medium text-slate-500">{formatCredits(estimate.price_per_comment)} credits per comment</p>}
                </div>
                <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-1">
                  <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Credits left</p>
                  <p className="m-0 mt-0.5 text-lg font-black tabular-nums text-slate-900">{formatCredits(estimate.credits_remaining)}</p>
                </div>
              </div>

              {posts.length > 1 && (
                <ul className="m-0 max-h-36 list-none space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {estimate.posts.map(item => (
                    <li key={item.post_id} className="flex items-center justify-between gap-3 px-1.5 py-1 text-xs">
                      <span className="min-w-0 truncate font-semibold text-slate-700">{textOf(item.post_id)}</span>
                      <span className="shrink-0 tabular-nums text-slate-500">
                        {formatCount(item.comment_count)} comments{!free && ` · ${formatCredits(item.estimated_credits)} credits`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {overBudget && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-5 text-amber-900">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                  <span>This can use more than your {formatCredits(estimate.credits_remaining)} remaining credits. The cleanup pauses when credits run out and continues after a new or upgraded subscription.</span>
                </div>
              )}

              <p className="m-0 text-[12px] leading-5 text-slate-500">
                {free ? 'Cleanup is free right now.' : 'Credits are charged only for comments the agent actually classifies, so this is the most it can cost. The page\'s own comments and comments already handled are skipped.'}
                {' '}Expected to finish <strong className="font-bold text-slate-700">{formatFromNow(estimate.estimated_finish_at)}</strong> ({formatDateTime(estimate.estimated_finish_at)}). It works through about 1,000 comments an hour per page.
              </p>

              <fieldset className="m-0 rounded-xl border border-slate-200 p-3.5">
                <legend className="px-1 text-[12px] font-black text-slate-800">Customers reporting a problem with their own order</legend>
                <p className="m-0 mb-2.5 text-[12px] leading-5 text-slate-500">For example "my parcel never arrived". What should happen to these comments?</p>
                {[
                  { value: false, title: 'Send them to my review list', detail: 'They stay on the post until you decide. Recommended.' },
                  { value: true, title: 'Delete them', detail: 'They are removed from the post. Follow up with the customer yourself.' },
                ].map(option => (
                  <label key={String(option.value)} className={`mb-1.5 flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 last:mb-0 ${deleteSupport === option.value ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="delete-support" checked={deleteSupport === option.value} onChange={() => setDeleteSupport(option.value)} className="mt-0.5 accent-emerald-600" />
                    <span>
                      <span className="block text-[13px] font-bold text-slate-900">{option.title}</span>
                      <span className="block text-[12px] text-slate-500">{option.detail}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </>
          )}

          {shownError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5">
              <p className="m-0 min-w-0 flex-1 text-[12.5px] font-semibold leading-5 text-rose-700">{cleanupErrorText(shownError, "Couldn't start the cleanup. Try again.")}</p>
              {followUp && onAction && (
                <button type="button" onClick={() => onAction(errorCode)} className="h-8 shrink-0 rounded-lg bg-rose-600 px-3 text-xs font-black text-white hover:bg-rose-700">{followUp}</button>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
          <button type="button" onClick={onClose} disabled={starting} className="h-10 rounded-lg px-4 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button
            type="button"
            onClick={start}
            disabled={!estimate || deleteSupport === null || starting}
            title={estimate && deleteSupport === null ? 'Choose what happens to support issues first' : undefined}
            className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-50"
          >
            {starting && <Loader2 size={15} className="animate-spin" />} Start cleanup
          </button>
        </footer>
      </div>
    </div>
  );
}
