import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brush, ExternalLink, ImageOff, Loader2, Megaphone, MessageSquareText, RefreshCw, ShieldCheck, ShieldOff } from 'lucide-react';
import { apiService } from '../../services/api';
import { useBusiness } from '../../context/BusinessContext';
import { isInstagram, platformLabel } from '../../utils/platforms';
import { RUN_STATUS, cleanupErrorCode, cleanupErrorText, formatCount, formatDate, formatFromNow, isRunActive, runProgress } from '../../utils/commentCleanup';
import CleanupDialog from './CleanupDialog';
import CleanupRuns from './CleanupRuns';

const POST_LIMIT = 25;
const MAX_SELECTED = 50;

function Switch({ checked, disabled, busy, onChange, label, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled || busy}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed ${checked ? 'bg-emerald-600' : 'bg-slate-300'} ${disabled ? 'opacity-50' : ''}`}
    >
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}>
        {busy && <Loader2 size={11} className="animate-spin text-slate-400" />}
      </span>
    </button>
  );
}

function LatestCleanup({ run }) {
  if (!run) return null;
  const meta = RUN_STATUS[run.status] || { label: run.status, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${meta.className}`} title={`Latest cleanup: ${meta.label.toLowerCase()}`}>
      <Brush size={10} aria-hidden="true" /> Cleanup {meta.label.toLowerCase()}{isRunActive(run) && run.status !== 'queued' ? ` · ${runProgress(run)}%` : ''}
    </span>
  );
}

/**
 * Comments tab: per page, the posts (ads included) with the live moderation switch, and
 * cleanups that work through comments already on chosen posts. Reads are open to every
 * member; switching and cleaning up need admin or owner.
 */
export default function CommentCleanup({ pages = [], isActive = true, onNavigate, onReconnect, onOpenComment, reviewReloadKey = 0 }) {
  const { canManage } = useBusiness();
  const activePages = useMemo(() => (pages || []).filter(page => page && page.is_active !== false), [pages]);
  const [pageId, setPageId] = useState('');
  const [view, setView] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [switching, setSwitching] = useState(() => new Set());
  const [notice, setNotice] = useState(null); // { tone, text }
  const [dialogPosts, setDialogPosts] = useState(null);
  const [runsRefreshKey, setRunsRefreshKey] = useState(0);

  useEffect(() => {
    if (!activePages.length) { setPageId(''); return; }
    if (!activePages.some(page => page.page_id === pageId)) setPageId(activePages[0].page_id);
  }, [activePages, pageId]);

  const page = activePages.find(item => item.page_id === pageId) || null;

  const loadPosts = useCallback(async ({ cursor = null } = {}) => {
    if (!pageId) return;
    if (cursor) setLoadingMore(true); else { setStatus('loading'); setLoadError(null); }
    try {
      const data = await apiService.getPagePosts(pageId, { cursor, limit: POST_LIMIT });
      const rows = data?.posts || [];
      setPosts(current => (cursor ? [...current, ...rows.filter(row => !current.some(existing => existing.post_id === row.post_id))] : rows));
      setNextCursor(data?.next_cursor || null);
      setStatus('ready');
    } catch (error) {
      console.error('Failed to load page posts:', error);
      if (cursor) setNotice({ tone: 'error', text: cleanupErrorText(error, "Couldn't load more posts.") });
      else { setLoadError(error); setStatus('error'); }
    } finally {
      setLoadingMore(false);
    }
  }, [pageId]);

  useEffect(() => {
    setPosts([]);
    setSelected(new Set());
    setNotice(null);
    setNextCursor(null);
    if (pageId) loadPosts();
  }, [pageId, loadPosts]);

  const setSwitch = async (postIds, value) => {
    const ids = [...new Set(postIds)].slice(0, MAX_SELECTED);
    if (!ids.length) return;
    const before = new Map(posts.filter(post => ids.includes(post.post_id)).map(post => [post.post_id, post.is_comment_manage]));
    setSwitching(current => new Set([...current, ...ids]));
    setPosts(current => current.map(post => (ids.includes(post.post_id) ? { ...post, is_comment_manage: value } : post)));
    setNotice(null);
    try {
      const result = await apiService.setPostsCommentManage(pageId, ids, value);
      const saved = new Map((result?.settings || []).map(item => [item.post_id, item.is_comment_manage]));
      setPosts(current => current.map(post => (saved.has(post.post_id) ? { ...post, is_comment_manage: saved.get(post.post_id) } : post)));
      if (ids.length > 1) {
        setNotice({ tone: 'ok', text: `Auto-moderation turned ${value ? 'on' : 'off'} for ${ids.length} posts.` });
        setSelected(new Set());
      }
    } catch (error) {
      setPosts(current => current.map(post => (before.has(post.post_id) ? { ...post, is_comment_manage: before.get(post.post_id) } : post)));
      setNotice({ tone: 'error', text: cleanupErrorText(error, "The change didn't save. Try again.") });
    } finally {
      setSwitching(current => {
        const next = new Set(current);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const toggleSelect = (postId) => setSelected(current => {
    const next = new Set(current);
    if (next.has(postId)) next.delete(postId);
    else if (next.size < MAX_SELECTED) next.add(postId);
    return next;
  });
  const allShownSelected = posts.length > 0 && posts.slice(0, MAX_SELECTED).every(post => selected.has(post.post_id));
  const selectedPosts = posts.filter(post => selected.has(post.post_id));

  const handleAction = (code) => {
    setDialogPosts(null);
    if (code === 'page_reconnect_required') onReconnect?.();
    else if (code === 'page_has_no_agent') onNavigate?.('agent');
    else if (code === 'subscription_required') onNavigate?.('subscription');
  };

  const onStarted = (result) => {
    setDialogPosts(null);
    setSelected(new Set());
    const runs = result?.runs || [];
    // A post that already had an active run gets that run back, not a new one.
    const existingIds = new Set((dialogPosts || []).map(post => post.latest_cleanup).filter(isRunActive).map(run => run.id));
    const fresh = runs.filter(run => !existingIds.has(run.id)).length;
    const already = runs.length - fresh;
    const parts = [];
    if (fresh) parts.push(`Cleanup started for ${fresh} post${fresh === 1 ? '' : 's'}.`);
    if (already) parts.push(`${already} post${already === 1 ? ' already had a cleanup' : 's already had cleanups'} in progress.`);
    if (fresh && result?.estimated_finish_at) parts.push(`Expected to finish ${formatFromNow(result.estimated_finish_at)}.`);
    setNotice({ tone: 'ok', text: parts.join(' ') });
    // Show the new runs on the posts too.
    setPosts(current => current.map(post => {
      const run = runs.find(item => item.post_id === post.post_id);
      return run ? { ...post, latest_cleanup: run } : post;
    }));
    setRunsRefreshKey(key => key + 1);
    setView('runs');
  };

  const reconnectNeeded = cleanupErrorCode(loadError) === 'page_reconnect_required';

  return (
    <div className="comment-cleanup mx-auto w-full max-w-5xl space-y-4 px-1 pb-10 pt-4 sm:pt-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Comments</p>
          <h1 className="m-0 font-['Epilogue'] text-2xl font-black tracking-tight text-slate-950">Posts and cleanup</h1>
          <p className="m-0 mt-1 max-w-2xl text-[13px] leading-5 text-slate-500">
            Choose which posts and ads the AI moderates, and clean up comments that were already there before it started.
          </p>
        </div>
        {activePages.length > 0 && (
          <label className="flex min-w-[220px] flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Page</span>
            <select
              value={pageId}
              onChange={(event) => setPageId(event.target.value)}
              className="h-10 rounded-lg border border-solid border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400"
            >
              {activePages.map(item => (
                <option key={item.page_id} value={item.page_id}>{item.name || item.page_name} · {platformLabel(item.platform)}</option>
              ))}
            </select>
          </label>
        )}
      </header>

      {activePages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <MessageSquareText size={26} className="mx-auto mb-2 text-slate-300" />
          <p className="m-0 text-sm font-bold text-slate-700">Connect a Facebook page or Instagram account first.</p>
          {onNavigate && <button type="button" onClick={() => onNavigate('channels')} className="mt-3 h-9 rounded-lg bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700">Go to Channels</button>}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-200" role="tablist" aria-label="Comments view">
            {[['posts', 'Posts'], ['runs', 'Cleanups']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                onClick={() => setView(id)}
                className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-bold transition-colors ${view === id ? 'border-emerald-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {!canManage && (
            <p className="m-0 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">Only admins and the owner can change moderation or start a cleanup.</p>
          )}

          {notice && (
            <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`m-0 rounded-lg px-3 py-2 text-xs font-semibold ${notice.tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>{notice.text}</p>
          )}

          {view === 'runs' ? (
            <CleanupRuns
              pageId={pageId}
              canManage={canManage}
              isActive={isActive && view === 'runs'}
              refreshKey={runsRefreshKey}
              onOpenComment={onOpenComment}
              onReconnect={onReconnect}
              reviewReloadKey={reviewReloadKey}
            />
          ) : status === 'loading' || status === 'idle' ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm font-medium text-slate-500">
              <Loader2 size={16} className="animate-spin text-emerald-500" /> Loading posts from {platformLabel(page?.platform)}
            </div>
          ) : status === 'error' ? (
            <div className={`rounded-2xl border px-5 py-8 text-center ${reconnectNeeded ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
              <p className={`m-0 text-sm font-semibold ${reconnectNeeded ? 'text-amber-900' : 'text-rose-700'}`}>{cleanupErrorText(loadError, "Couldn't load posts.")}</p>
              <div className="mt-3 flex justify-center gap-2">
                {reconnectNeeded && onReconnect && (
                  <button type="button" onClick={onReconnect} className="h-9 rounded-lg bg-amber-600 px-4 text-xs font-black text-white hover:bg-amber-700">Reconnect page</button>
                )}
                <button type="button" onClick={() => loadPosts()} className="flex h-9 items-center gap-1.5 rounded-lg border border-solid border-slate-200 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-50">
                  <RefreshCw size={13} /> Try again
                </button>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <p className="m-0 text-sm font-bold text-slate-700">This page has no posts yet.</p>
            </div>
          ) : (
            <>
              {canManage && (
                <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={allShownSelected}
                      onChange={() => setSelected(allShownSelected ? new Set() : new Set(posts.slice(0, MAX_SELECTED).map(post => post.post_id)))}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    {selected.size ? `${selected.size} selected` : 'Select posts'}
                  </label>
                  {selected.size >= MAX_SELECTED && <span className="text-[11px] font-medium text-slate-400">Up to {MAX_SELECTED} at a time</span>}
                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    <button type="button" onClick={() => setSwitch([...selected], true)} disabled={!selected.size} className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                      <ShieldCheck size={14} /> Moderate
                    </button>
                    <button type="button" onClick={() => setSwitch([...selected], false)} disabled={!selected.size} className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                      <ShieldOff size={14} /> Stop moderating
                    </button>
                    <button type="button" onClick={() => setDialogPosts(selectedPosts)} disabled={!selected.size} className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-50">
                      <Brush size={13} /> Clean up comments
                    </button>
                  </div>
                </div>
              )}

              <ul className="m-0 list-none space-y-2 p-0">
                {posts.map(post => {
                  const isAd = post.is_published === false && !isInstagram(page?.platform);
                  return (
                    <li key={post.post_id} className={`flex items-start gap-3 rounded-2xl border bg-white p-3 shadow-sm transition-colors ${selected.has(post.post_id) ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200'}`}>
                      {canManage && (
                        <input
                          type="checkbox"
                          checked={selected.has(post.post_id)}
                          disabled={!selected.has(post.post_id) && selected.size >= MAX_SELECTED}
                          onChange={() => toggleSelect(post.post_id)}
                          aria-label="Select post"
                          className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
                        />
                      )}
                      {post.picture_url ? (
                        <img src={post.picture_url} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg border border-slate-100 object-cover" />
                      ) : (
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300"><ImageOff size={18} aria-hidden="true" /></span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="m-0 line-clamp-2 text-[13.5px] font-semibold leading-5 text-slate-900">{post.text || <span className="italic text-slate-400">No text</span>}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-slate-500">
                          <span>{formatDate(post.created_time)}</span>
                          <span className="tabular-nums">{post.comment_count == null ? 'Comments unknown' : `${formatCount(post.comment_count)} comment${post.comment_count === 1 ? '' : 's'}`}</span>
                          {isAd && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-700">
                              <Megaphone size={10} aria-hidden="true" /> Ad
                            </span>
                          )}
                          <LatestCleanup run={post.latest_cleanup} />
                          {post.permalink_url && (
                            <a href={post.permalink_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-slate-500 hover:text-emerald-700">
                              View <ExternalLink size={11} aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Switch
                          checked={post.is_comment_manage !== false}
                          disabled={!canManage}
                          busy={switching.has(post.post_id)}
                          onChange={(value) => setSwitch([post.post_id], value)}
                          label="Auto-moderate new comments"
                          title={canManage ? undefined : 'Only admins and the owner can change this'}
                        />
                        <span className="text-[10px] font-bold text-slate-400">{post.is_comment_manage !== false ? 'Moderated' : 'Not moderated'}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="m-0 text-[11px] text-slate-400">
                Turning moderation off makes the AI ignore new comments on that post. It doesn't stop a cleanup you started.
              </p>

              {nextCursor && (
                <div className="flex justify-center">
                  <button type="button" onClick={() => loadPosts({ cursor: nextCursor })} disabled={loadingMore} className="flex h-9 items-center gap-2 rounded-lg border border-solid border-slate-200 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    {loadingMore && <Loader2 size={13} className="animate-spin" />} Load older posts
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {dialogPosts && (
        <CleanupDialog
          pageId={pageId}
          posts={dialogPosts}
          onClose={() => setDialogPosts(null)}
          onStarted={onStarted}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
