import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Loader2, RefreshCw, Trash2, EyeOff } from 'lucide-react';
import { apiService } from '../../services/api';
import { commentCategoryLabel, COMMENT_CATEGORIES } from '../../utils/comments';
import {
  RUN_STATUS, cleanupErrorText, formatCount, formatCredits, formatDateTime, isRunActive, isRunMoving, pauseReasonText, runProgress,
} from '../../utils/commentCleanup';

const POLL_MS = 60 * 1000;
const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'queued', label: 'Queued' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** Comments a run sent to review, with bulk delete / dismiss for admins. */
function RunReviewList({ runId, canManage, onOpenComment, reloadKey }) {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [status, setStatus] = useState('loading');
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(null); // 'delete_comment' | 'dismiss'
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState(null); // { tone, text }
  const timersRef = useRef([]);

  const load = useCallback(async (cursor = null) => {
    if (!cursor) setStatus(current => (current === 'ready' ? 'ready' : 'loading'));
    try {
      const data = await apiService.getComments({ cleanup_run_id: runId, execution_status: 'pending_review', page_size: 50, cursor });
      const rows = data?.comments || [];
      setItems(current => (cursor ? [...current, ...rows] : rows));
      setNextCursor(data?.pagination?.has_more ? data.pagination.next_cursor : null);
      setStatus('ready');
      if (!cursor) {
        const ids = new Set(rows.map(row => row.id));
        setSelected(current => new Set([...current].filter(id => ids.has(id))));
      }
    } catch (error) {
      console.error('Failed to load cleanup review items:', error);
      setStatus('error');
    }
  }, [runId]);

  useEffect(() => { load(); }, [load, reloadKey]);
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const toggle = (id) => setSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSelected = items.length > 0 && items.every(item => selected.has(item.id));

  const runBulk = async (action) => {
    const ids = [...selected].slice(0, 500);
    if (!ids.length || busy) return;
    setBusy(action);
    setNotice(null);
    try {
      const result = await apiService.bulkCommentAction(ids, action);
      setConfirmDelete(false);
      setSelected(new Set());
      const count = result?.accepted ?? ids.length;
      setNotice({
        tone: 'ok',
        text: action === 'delete_comment'
          ? `Deleting ${count} comment${count === 1 ? '' : 's'}. They leave this list as the job finishes.`
          : `Dismissed ${count} comment${count === 1 ? '' : 's'}. They leave this list as the job finishes.`,
      });
      // There's no job progress endpoint: re-read the list a few times while it runs.
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [3000, 8000, 20000].map(delay => setTimeout(() => load(), delay));
    } catch (error) {
      setNotice({ tone: 'error', text: cleanupErrorText(error, "The action didn't go through. Try again.") });
    } finally {
      setBusy(null);
    }
  };

  if (status === 'loading') {
    return <p className="m-0 flex items-center gap-2 py-4 text-xs font-medium text-slate-500"><Loader2 size={14} className="animate-spin text-emerald-500" /> Loading comments to review</p>;
  }
  if (status === 'error') {
    return (
      <p className="m-0 py-4 text-xs font-semibold text-rose-600">
        Couldn't load the comments. <button type="button" onClick={() => load()} className="font-black underline">Try again</button>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {notice && (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`m-0 rounded-lg px-3 py-2 text-xs font-semibold ${notice.tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>{notice.text}</p>
      )}
      {items.length === 0 ? (
        <p className="m-0 py-3 text-xs font-medium text-slate-500">Nothing left to review from this cleanup.</p>
      ) : (
        <>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(items.map(item => item.id)))} className="h-4 w-4 accent-emerald-600" />
                {selected.size ? `${selected.size} selected` : 'Select all'}
              </label>
              {selected.size > 0 && (
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  {confirmDelete ? (
                    <>
                      <span className="text-xs font-semibold text-rose-700">Delete {selected.size} from the post? This can't be undone.</span>
                      <button type="button" onClick={() => setConfirmDelete(false)} disabled={Boolean(busy)} className="h-8 rounded-lg px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Keep</button>
                      <button type="button" onClick={() => runBulk('delete_comment')} disabled={Boolean(busy)} className="flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-60">
                        {busy === 'delete_comment' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => runBulk('dismiss')} disabled={Boolean(busy)} className="flex h-8 items-center gap-1.5 rounded-lg border border-solid border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                        {busy === 'dismiss' ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />} Dismiss
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(true)} disabled={Boolean(busy)} className="flex h-8 items-center gap-1.5 rounded-lg border border-solid border-rose-200 bg-white px-3 text-xs font-black text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                        <Trash2 size={13} /> Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <ul className="m-0 list-none divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white p-0">
            {items.map(item => (
              <li key={item.id} className="flex items-start gap-3 px-3 py-2.5">
                {canManage && (
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label={`Select comment from ${item.commenter_name}`} className="mt-1 h-4 w-4 shrink-0 accent-emerald-600" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-black text-slate-900">{item.commenter_name || 'Someone'}</span>
                    {item.category && (
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${COMMENT_CATEGORIES[item.category]?.className || 'bg-slate-100 text-slate-600'}`}>{commentCategoryLabel(item.category)}</span>
                    )}
                    {item.is_deleted && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-700">Deleted</span>}
                  </div>
                  <p className="m-0 mt-0.5 line-clamp-2 text-[13px] leading-5 text-slate-700">{item.comment_text}</p>
                  {item.reason && <p className="m-0 mt-0.5 line-clamp-1 text-[11px] text-slate-400">{item.reason}</p>}
                </div>
                {onOpenComment && (
                  <button type="button" onClick={() => onOpenComment(item.id)} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-50">Open</button>
                )}
              </li>
            ))}
          </ul>
          {nextCursor && (
            <button type="button" onClick={() => load(nextCursor)} className="h-8 rounded-lg px-3 text-xs font-black text-slate-600 hover:bg-slate-100">Load more</button>
          )}
        </>
      )}
    </div>
  );
}

function Counter({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="min-w-0">
      <p className="m-0 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className={`m-0 text-sm font-black tabular-nums ${tone}`}>{formatCount(value)}</p>
    </div>
  );
}

function RunCard({ run, canManage, onChanged, onOpenComment, onReconnect, reviewReloadKey }) {
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const meta = RUN_STATUS[run.status] || { label: run.status, className: 'bg-slate-100 text-slate-600' };
  const progress = runProgress(run);
  const free = Number(run.credits_per_comment) === 0;
  const hasReview = Number(run.review_count) + Number(run.failed_count) > 0;

  const cancel = async () => {
    setCancelling(true);
    setError('');
    try {
      const updated = await apiService.cancelCommentCleanup(run.id);
      onChanged(updated);
      setConfirmCancel(false);
    } catch (cancelError) {
      setError(cleanupErrorText(cancelError, "Couldn't cancel. Try again."));
      if (cancelError?.status === 409) onChanged(null);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="m-0 line-clamp-2 text-[13.5px] font-bold leading-5 text-slate-900">{run.post_text || 'Post without text'}</p>
          <p className="m-0 mt-0.5 text-[11px] font-medium text-slate-400">
            Started {formatDateTime(run.created_at)}
            {run.finished_at && ` · ended ${formatDateTime(run.finished_at)}`}
            {` · support issues ${run.delete_support_issues ? 'deleted' : 'sent to review'}`}
          </p>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide ${meta.className}`}>{meta.label}</span>
      </div>

      {run.status === 'paused' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="m-0 flex min-w-0 flex-1 items-start gap-2 text-xs font-semibold text-amber-900">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />{pauseReasonText(run.pause_reason)}
          </p>
          {run.pause_reason === 'page_reconnect_required' && onReconnect && (
            <button type="button" onClick={onReconnect} className="h-7 shrink-0 rounded-md bg-amber-600 px-2.5 text-[11px] font-black text-white hover:bg-amber-700">Reconnect page</button>
          )}
        </div>
      )}
      {run.status === 'failed' && run.error_message && (
        <p className="m-0 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{run.error_message}</p>
      )}
      {run.status === 'queued' && (
        <p className="m-0 mt-3 text-xs font-medium text-slate-500">Waiting for the next batch. The first one starts within a minute.</p>
      )}

      {(isRunActive(run) || run.processed_count > 0) && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Cleanup progress">
            <div className={`h-full rounded-full ${run.status === 'paused' ? 'bg-amber-500' : run.status === 'failed' || run.status === 'cancelled' ? 'bg-slate-400' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }} />
          </div>
          <p className="m-0 mt-1 text-[11px] font-medium text-slate-500">
            {isRunActive(run)
              ? `${formatCount(Number(run.processed_count) + Number(run.skipped_count))} of about ${formatCount(run.estimated_comments)} comments`
              : `${formatCount(Number(run.processed_count) + Number(run.skipped_count))} comments checked`}
            {run.status === 'running' && ' · updates about once an hour'}
          </p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Counter label="Classified" value={run.processed_count} />
        <Counter label="Deleted" value={run.deleted_count} tone="text-rose-700" />
        <Counter label="To review" value={run.review_count} tone="text-amber-700" />
        <Counter label="Skipped" value={run.skipped_count} tone="text-slate-500" />
        <Counter label="Failed" value={run.failed_count} tone={run.failed_count ? 'text-rose-700' : 'text-slate-500'} />
        <div className="min-w-0">
          <p className="m-0 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Credits</p>
          <p className="m-0 text-sm font-black tabular-nums text-slate-900">{free ? 'Free' : formatCredits(run.credits_charged)}</p>
        </div>
      </div>

      {error && <p role="alert" className="m-0 mt-2 text-xs font-semibold text-rose-600">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {hasReview && (
          <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="flex h-8 items-center gap-1.5 rounded-lg border border-solid border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50">
            Review comments <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
        {canManage && isRunActive(run) && (
          confirmCancel ? (
            <span className="ml-auto flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Stop this cleanup? Comments already handled stay handled.</span>
              <button type="button" onClick={() => setConfirmCancel(false)} disabled={cancelling} className="h-8 rounded-lg px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Keep running</button>
              <button type="button" onClick={cancel} disabled={cancelling} className="flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-60">
                {cancelling && <Loader2 size={13} className="animate-spin" />} Stop cleanup
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmCancel(true)} className="ml-auto h-8 rounded-lg px-3 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-rose-700">Cancel cleanup</button>
          )
        )}
      </div>

      {open && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <RunReviewList runId={run.id} canManage={canManage} onOpenComment={onOpenComment} reloadKey={reviewReloadKey} />
        </div>
      )}
    </li>
  );
}

/**
 * Cleanup runs of a page, newest first. Re-reads every minute while a run is queued or
 * running and the tab is visible (counters move once per hourly batch).
 */
export default function CleanupRuns({ pageId, canManage, isActive, refreshKey, onOpenComment, onReconnect, reviewReloadKey }) {
  const [runs, setRuns] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [total, setTotal] = useState(null);
  const [filter, setFilter] = useState('');
  const [retries, setRetries] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // The list shown belongs to `loaded.key`; while it differs from the wanted key
  // (another page, filter or refresh) the panel shows its loading state.
  const requestKey = `${pageId}|${filter}|${refreshKey}|${retries}`;
  const [loaded, setLoaded] = useState({ key: null, error: '' });
  const status = loaded.key !== requestKey ? 'loading' : loaded.error ? 'error' : 'ready';
  const error = loaded.error;

  // Background re-reads (polling, refresh, more): failures keep the list as it is.
  const load = useCallback(async ({ cursor = null } = {}) => {
    if (!pageId) return;
    try {
      const data = await apiService.getCommentCleanups({ pageId, status: filter || undefined, cursor });
      setRuns(current => (cursor ? [...current, ...(data?.runs || [])] : (data?.runs || [])));
      setNextCursor(data?.pagination?.has_more ? data.pagination.next_cursor : null);
      setTotal(data?.pagination?.total ?? null);
    } catch (loadError) {
      console.error('Failed to refresh cleanup runs:', loadError);
    }
  }, [pageId, filter]);

  useEffect(() => {
    if (!pageId) return undefined;
    let cancelled = false;
    const key = `${pageId}|${filter}|${refreshKey}|${retries}`;
    apiService.getCommentCleanups({ pageId, status: filter || undefined })
      .then(data => {
        if (cancelled) return;
        setRuns(data?.runs || []);
        setNextCursor(data?.pagination?.has_more ? data.pagination.next_cursor : null);
        setTotal(data?.pagination?.total ?? null);
        setLoaded({ key, error: '' });
      })
      .catch(loadError => {
        console.error('Failed to load cleanup runs:', loadError);
        if (!cancelled) setLoaded({ key, error: cleanupErrorText(loadError, "Couldn't load cleanups.") });
      });
    return () => { cancelled = true; };
  }, [pageId, filter, refreshKey, retries]);

  const moving = runs.some(isRunMoving);
  useEffect(() => {
    if (!isActive || !moving) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load({ quiet: true });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [isActive, moving, load]);

  const refresh = async () => {
    setRefreshing(true);
    await load({ quiet: true });
    setRefreshing(false);
  };

  const onRunChanged = (updated) => {
    if (!updated) { load({ quiet: true }); return; }
    setRuns(current => current.map(run => (run.id === updated.id ? updated : run)));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter cleanups by status">
          {STATUS_FILTERS.map(option => (
            <button
              key={option.value || 'all'}
              type="button"
              role="tab"
              aria-selected={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`h-8 rounded-full px-3 text-xs font-bold transition-colors ${filter === option.value ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={refresh} disabled={refreshing || status === 'loading'} className="ml-auto flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {status === 'loading' ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-14 text-sm font-medium text-slate-500">
          <Loader2 size={16} className="animate-spin text-emerald-500" /> Loading cleanups
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm font-semibold text-rose-700">
          {error} <button type="button" onClick={() => setRetries(count => count + 1)} className="font-black underline">Try again</button>
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="m-0 text-sm font-bold text-slate-700">{filter ? 'No cleanups with this status.' : 'No cleanups on this page yet.'}</p>
          {!filter && <p className="m-0 mt-1 text-xs text-slate-500">Select posts on the Posts tab and choose Clean up comments.</p>}
        </div>
      ) : (
        <>
          {moving && (
            <p className="m-0 text-[11px] font-medium text-slate-500">
              Progress refreshes every minute while a cleanup is queued or running.
            </p>
          )}
          <ul className="m-0 list-none space-y-3 p-0">
            {runs.map(run => (
              <RunCard key={run.id} run={run} canManage={canManage} onChanged={onRunChanged} onOpenComment={onOpenComment} onReconnect={onReconnect} reviewReloadKey={reviewReloadKey} />
            ))}
          </ul>
          {nextCursor && (
            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={() => load({ cursor: nextCursor })} className="h-9 rounded-lg border border-solid border-slate-200 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-50">Load more</button>
              {total != null && <span className="text-[11px] text-slate-400">{runs.length} of {total}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
