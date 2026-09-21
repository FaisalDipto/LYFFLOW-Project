import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '../services/api';
import {
  closeNotificationStream,
  reconnectNotificationStream,
  subscribeToNotificationStream,
} from '../services/notificationStream';

const NotificationsContext = createContext(null);

const PAGE_SIZE = 20;

// Only used while the stream is down — the stream is the primary mechanism.
const FALLBACK_POLL_MS = 60000;

const isUnread = (notification) => !notification?.read_at;

export function NotificationsProvider({ children, onSessionExpired }) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [category, setCategory] = useState('');
  const [streamStatus, setStreamStatus] = useState('connecting'); // connecting | live | offline

  const categoryRef = useRef(category);
  categoryRef.current = category;

  // Guards a late first-page response from overwriting a newer one.
  const listRequestVersionRef = useRef(0);
  // Page one is only fetched once the panel has been opened at least once.
  const hasLoadedRef = useRef(false);

  const sessionExpiredRef = useRef(onSessionExpired);
  sessionExpiredRef.current = onSessionExpired;

  const handleSessionExpired = useCallback(() => {
    closeNotificationStream();
    sessionExpiredRef.current?.();
  }, []);

  // Every notification request funnels its 401s into the app's normal
  // session-expiry path instead of handling logout locally.
  const guardSession = useCallback((requestError) => {
    if (requestError?.status === 401) {
      handleSessionExpired();
      return true;
    }
    return false;
  }, [handleSessionExpired]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await apiService.getUnreadNotificationCount();
      setUnreadCount(Number(data?.unread_count) || 0);
    } catch (requestError) {
      if (!guardSession(requestError)) {
        console.warn('[notifications] could not refresh the unread count', requestError);
      }
    }
  }, [guardSession]);

  // Loads page one for the active category. Also used to backfill after a reconnect.
  const loadFirstPage = useCallback(async () => {
    const requestVersion = ++listRequestVersionRef.current;
    setStatus(current => (current === 'ready' ? current : 'loading'));
    setError(null);

    try {
      const data = await apiService.getNotifications({
        category: categoryRef.current || undefined,
        page_size: PAGE_SIZE,
      });
      if (requestVersion !== listRequestVersionRef.current) return;

      setItems(Array.isArray(data?.notifications) ? data.notifications : []);
      setNextCursor(data?.pagination?.next_cursor || null);
      setHasMore(Boolean(data?.pagination?.has_more));
      setUnreadCount(Number(data?.unread_count) || 0);
      setStatus('ready');
    } catch (requestError) {
      if (requestVersion !== listRequestVersionRef.current) return;
      if (guardSession(requestError)) return;
      console.error('[notifications] could not load notifications', requestError);
      setError(requestError.message || 'We could not load your notifications.');
      setStatus('error');
    }
  }, [guardSession]);

  const loadMore = useCallback(async () => {
    // Never send a cursor we were not handed.
    if (!hasMore || !nextCursor || isLoadingMore) return;
    const requestVersion = listRequestVersionRef.current;
    setIsLoadingMore(true);

    try {
      const data = await apiService.getNotifications({
        category: categoryRef.current || undefined,
        cursor: nextCursor,
        page_size: PAGE_SIZE,
      });
      if (requestVersion !== listRequestVersionRef.current) return;

      const page = Array.isArray(data?.notifications) ? data.notifications : [];
      setItems(current => {
        const seen = new Set(current.map(item => item.notification_id));
        return [...current, ...page.filter(item => !seen.has(item.notification_id))];
      });
      setNextCursor(data?.pagination?.next_cursor || null);
      setHasMore(Boolean(data?.pagination?.has_more));
    } catch (requestError) {
      if (guardSession(requestError)) return;
      console.error('[notifications] could not load more notifications', requestError);
      setError(requestError.message || 'We could not load more notifications.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [guardSession, hasMore, isLoadingMore, nextCursor]);

  const markRead = useCallback(async (notificationIds) => {
    const targets = new Set((notificationIds || []).filter(Boolean));
    if (targets.size === 0) return;

    const snapshotItems = items;
    const snapshotCount = unreadCount;
    const affected = items.filter(item => targets.has(item.notification_id) && isUnread(item));
    if (affected.length === 0) return;

    const readAt = new Date().toISOString();
    setItems(current => current.map(item => (
      targets.has(item.notification_id) && isUnread(item) ? { ...item, read_at: readAt } : item
    )));
    setUnreadCount(current => Math.max(0, current - affected.length));

    try {
      const data = await apiService.markNotificationsRead([...targets]);
      setUnreadCount(Number(data?.unread_count) || 0);
    } catch (requestError) {
      setItems(snapshotItems);
      setUnreadCount(snapshotCount);
      if (guardSession(requestError)) return;
      console.error('[notifications] could not mark notifications read', requestError);
    }
  }, [guardSession, items, unreadCount]);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0 && items.every(item => !isUnread(item))) return;
    const snapshotItems = items;
    const snapshotCount = unreadCount;

    const readAt = new Date().toISOString();
    setItems(current => current.map(item => (isUnread(item) ? { ...item, read_at: readAt } : item)));
    setUnreadCount(0);

    try {
      // An omitted body marks every unread notification, not just the loaded page.
      const data = await apiService.markNotificationsRead();
      setUnreadCount(Number(data?.unread_count) || 0);
    } catch (requestError) {
      setItems(snapshotItems);
      setUnreadCount(snapshotCount);
      if (guardSession(requestError)) return;
      console.error('[notifications] could not mark all notifications read', requestError);
    }
  }, [guardSession, items, unreadCount]);

  const dismiss = useCallback(async (notificationId) => {
    if (!notificationId) return;
    const snapshotItems = items;
    const snapshotCount = unreadCount;
    const target = items.find(item => item.notification_id === notificationId);

    setItems(current => current.filter(item => item.notification_id !== notificationId));
    if (target && isUnread(target)) setUnreadCount(current => Math.max(0, current - 1));

    try {
      const data = await apiService.deleteNotification(notificationId);
      setUnreadCount(Number(data?.unread_count) || 0);
    } catch (requestError) {
      // 404 means it is already gone, which is the outcome we wanted.
      if (requestError?.status === 404) return;
      setItems(snapshotItems);
      setUnreadCount(snapshotCount);
      if (guardSession(requestError)) return;
      console.error('[notifications] could not dismiss the notification', requestError);
    }
  }, [guardSession, items, unreadCount]);

  const addPushedNotification = useCallback((pushed) => {
    if (!pushed?.notification_id) return;

    setItems(current => {
      if (current.some(item => item.notification_id === pushed.notification_id)) return current;
      // A filtered list only shows its own category; the badge still counts everything.
      if (categoryRef.current && pushed.category !== categoryRef.current) return current;
      return [pushed, ...current];
    });

    // A pushed frame carries no unread_count, so the badge moves locally.
    if (isUnread(pushed)) setUnreadCount(current => current + 1);
  }, []);

  // Seed the badge before the panel is ever opened.
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Reload page one whenever the category filter changes, once the list exists.
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const ensureLoaded = useCallback(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadFirstPage();
  }, [loadFirstPage]);

  const backfill = useCallback(() => {
    refreshUnreadCount();
    if (hasLoadedRef.current) loadFirstPage();
  }, [loadFirstPage, refreshUnreadCount]);

  // One stream for the whole app, opened here and nowhere else.
  useEffect(() => {
    return subscribeToNotificationStream({
      onStatus: setStreamStatus,
      onNotification: addPushedNotification,
      // No Last-Event-ID replay, so a fresh subscription backfills from the API.
      onReady: backfill,
      onGiveUp: async () => {
        // Repeated failures are usually an expired session; confirm with a cheap
        // call so a flaky network does not bounce the user to the login screen.
        try {
          const data = await apiService.getUnreadNotificationCount();
          setUnreadCount(Number(data?.unread_count) || 0);
        } catch (requestError) {
          if (requestError?.status === 401) handleSessionExpired();
        }
      },
    });
  }, [addPushedNotification, backfill, handleSessionExpired]);

  // Slow fallback while the stream is down. Never the primary mechanism.
  useEffect(() => {
    if (streamStatus === 'live') return undefined;
    const timer = setInterval(backfill, FALLBACK_POLL_MS);
    return () => clearInterval(timer);
  }, [backfill, streamStatus]);

  // The stream may have dropped frames while the tab was hidden.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') backfill();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [backfill]);

  const retry = useCallback(() => {
    if (streamStatus === 'offline') reconnectNotificationStream();
    hasLoadedRef.current = true;
    loadFirstPage();
  }, [loadFirstPage, streamStatus]);

  const value = useMemo(() => ({
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
  }), [
    category, dismiss, ensureLoaded, error, hasMore, isLoadingMore, items,
    loadMore, markAllRead, markRead, retry, status, streamStatus, unreadCount,
  ]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used inside a NotificationsProvider');
  return context;
}
