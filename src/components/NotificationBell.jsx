import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  Inbox,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useNotifications } from '../context/NotificationsContext';

// The six category values the inbox endpoint accepts, plus an unfiltered view.
const NOTIFICATION_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'conversation', label: 'Conversations' },
  { value: 'order', label: 'Orders' },
  { value: 'lead', label: 'Leads' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'account', label: 'Account' },
  { value: 'system', label: 'System' },
];

// `severity` comes from the backend and may grow, so anything unrecognised
// falls back to the neutral treatment instead of rendering untyped.
const SEVERITY_STYLES = {
  info: {
    icon: Info,
    iconClass: 'bg-sky-50 text-sky-600',
    rowClass: '',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'bg-emerald-50 text-emerald-600',
    rowClass: '',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'bg-amber-50 text-amber-600',
    rowClass: '',
  },
  critical: {
    icon: AlertOctagon,
    iconClass: 'bg-rose-100 text-rose-600',
    // Critical carries a border, a tinted surface and its own icon so it never
    // depends on colour alone.
    rowClass: 'border-l-[3px] border-l-rose-500 bg-rose-50/60',
  },
};

const severityStyle = (severity) => SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;

const RELATIVE_UNITS = [
  { limit: 60, seconds: 1, unit: 'second' },
  { limit: 3600, seconds: 60, unit: 'minute' },
  { limit: 86400, seconds: 3600, unit: 'hour' },
  { limit: 604800, seconds: 86400, unit: 'day' },
  { limit: 2629800, seconds: 604800, unit: 'week' },
  { limit: 31557600, seconds: 2629800, unit: 'month' },
];

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'narrow' });

const formatRelativeTime = (isoDate) => {
  if (!isoDate) return '';
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return '';

  const elapsedSeconds = (timestamp - Date.now()) / 1000;
  const magnitude = Math.abs(elapsedSeconds);
  if (magnitude < 45) return 'just now';

  const match = RELATIVE_UNITS.find(entry => magnitude < entry.limit)
    || { seconds: 31557600, unit: 'year' };
  return relativeFormatter.format(Math.round(elapsedSeconds / match.seconds), match.unit);
};

const formatAbsoluteTime = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

/**
 * Maps a notification onto a dashboard destination. `payload` is nullable and
 * an unknown `type` is expected, so anything unresolvable simply does not link.
 */
const resolveDeepLink = (notification) => {
  const payload = notification?.payload || {};
  const pageId = notification?.page_id || null;

  switch (notification?.type) {
    case 'human_handover_needed':
      return payload.conversation_id
        ? { tab: 'conversation', pageId, conversationId: payload.conversation_id }
        : { tab: 'conversation', pageId };

    case 'order_created':
    case 'delivery_status_update':
    case 'delivery_failed':
      return payload.customer_order_id
        ? { tab: 'customer-orders', pageId, recordType: 'order', recordId: payload.customer_order_id }
        : { tab: 'customer-orders', pageId };

    case 'lead_created':
      return payload.customer_lead_id
        ? { tab: 'customer-leads', pageId, recordType: 'lead', recordId: payload.customer_lead_id }
        : { tab: 'customer-leads', pageId };

    case 'knowledge_processing_completed':
    case 'knowledge_processing_failed':
      return { tab: 'knowledge-documents' };

    case 'page_disconnected':
      return { tab: 'overview' };

    case 'conversation_limit_reached':
    case 'storage_limit_reached':
      return { tab: 'subscription' };

    default:
      return null;
  }
};

const NotificationSkeleton = () => (
  <div className="space-y-1 p-2">
    {[0, 1, 2, 3].map(row => (
      <div key={row} className="flex animate-pulse gap-3 rounded-xl p-3">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-100" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <div className="h-2.5 w-3/4 rounded-full bg-slate-100" />
          <div className="h-2.5 w-1/2 rounded-full bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

export default function NotificationBell({ isOpen, onOpenChange, onNavigate }) {
  const {
    items,
    unreadCount,
    hasMore,
    status,
    error,
    isLoadingMore,
    category,
    streamStatus,
    setCategory,
    ensureLoaded,
    loadMore,
    markRead,
    markAllRead,
    dismiss,
    retry,
  } = useNotifications();

  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) ensureLoaded();
  }, [ensureLoaded, isOpen]);

  // Same outside-click idiom the page dropdown uses elsewhere in the dashboard.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (!event.target.closest('.notifications-popover-container')) onOpenChange(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  const handleScroll = useCallback((event) => {
    if (!hasMore || isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 120) loadMore();
  }, [hasMore, isLoadingMore, loadMore]);

  const handleItemClick = (notification) => {
    markRead([notification.notification_id]);
    const target = resolveDeepLink(notification);
    if (!target) return;
    onOpenChange(false);
    onNavigate?.(target);
  };

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const isEmpty = status === 'ready' && items.length === 0;

  return (
    <div className="notifications-popover-container relative">
      <button
        type="button"
        className={`notifications-bell relative flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border transition ${isOpen ? 'border-slate-300 bg-slate-100 text-slate-900' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'}`}
        onClick={() => onOpenChange(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        title="Notifications"
      >
        <Bell size={18} strokeWidth={2.1} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black leading-none text-white ring-2 ring-white">
            {badgeLabel}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="notifications-panel fixed inset-x-3 top-[76px] z-[60] flex max-h-[min(560px,calc(100vh-96px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[390px]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-950">Notifications</h3>
              {streamStatus !== 'live' && (
                <span
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-500"
                  title={streamStatus === 'connecting' ? 'Connecting to live updates' : 'Live updates are offline; refreshing periodically'}
                >
                  {streamStatus === 'connecting' ? 'Connecting' : 'Offline'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">
            {NOTIFICATION_CATEGORIES.map(option => (
              <button
                type="button"
                key={option.value || 'all'}
                onClick={() => setCategory(option.value)}
                aria-pressed={category === option.value}
                className={`h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-bold transition-all ${category === option.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
            {status === 'loading' && items.length === 0 && <NotificationSkeleton />}

            {status === 'error' && items.length === 0 && (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                  <AlertTriangle size={18} />
                </span>
                <p className="text-sm font-medium text-slate-500">{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-600"
                >
                  <RefreshCw size={13} />
                  Try again
                </button>
              </div>
            )}

            {isEmpty && (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <Inbox size={18} />
                </span>
                <p className="text-sm font-medium text-slate-400">
                  {category ? 'Nothing in this category yet.' : 'You are all caught up.'}
                </p>
              </div>
            )}

            {items.map(notification => {
              const { icon: SeverityIcon, iconClass, rowClass } = severityStyle(notification.severity);
              const unread = !notification.read_at;
              const isLinked = Boolean(resolveDeepLink(notification));

              return (
                <div
                  key={notification.notification_id}
                  className={`group relative flex gap-3 border-b border-slate-50 px-4 py-3 transition ${rowClass} ${unread ? 'bg-emerald-50/40' : ''} hover:bg-slate-50`}
                >
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                    <SeverityIcon size={17} strokeWidth={2.2} />
                  </span>

                  <button
                    type="button"
                    onClick={() => handleItemClick(notification)}
                    className={`min-w-0 flex-1 pr-6 text-left ${isLinked ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-start gap-2">
                      <p className={`min-w-0 flex-1 text-[13px] leading-snug ${unread ? 'font-extrabold text-slate-950' : 'font-semibold text-slate-700'}`}>
                        {notification.title}
                      </p>
                      {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                    </div>
                    {notification.body && (
                      <p className="mt-1 text-[12px] font-medium leading-snug text-slate-500">{notification.body}</p>
                    )}
                    <p
                      className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"
                      title={formatAbsoluteTime(notification.created_at)}
                    >
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => dismiss(notification.notification_id)}
                    aria-label="Dismiss notification"
                    title="Dismiss"
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-lg text-slate-300 opacity-0 transition hover:bg-slate-200 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}

            {hasMore && (
              <div className="p-3">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                >
                  {isLoadingMore && <Loader2 size={13} className="animate-spin" />}
                  {isLoadingMore ? 'Loading' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
