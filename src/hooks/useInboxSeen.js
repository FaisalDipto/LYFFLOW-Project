import { useCallback, useEffect, useMemo, useState } from 'react';

// When each conversation was last opened in this browser, per page, so the list can show
// which ones have a customer message you haven't seen. The API has no read state for the
// team, so this is per browser. The first visit sets a baseline: only messages after it
// count, so an existing inbox doesn't start out all unread.
const storageKey = (pageId) => `lyfflow-inbox-seen:${pageId}`;
// Keeps at most this many conversations per page so storage doesn't grow forever.
const MAX_ENTRIES = 500;
// Mock mode counts from an hour before each load, so the mock inbox opens with recent
// customer messages unread instead of needing live events to show the state.
const MOCK_MODE = typeof window !== 'undefined' && window.location.search.includes('mock=true');
const MOCK_BASELINE = new Date(Date.now() - 60 * 60 * 1000).toISOString();

const readStore = (pageId) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(pageId)) || 'null');
    if (parsed && typeof parsed === 'object' && parsed.baseline && parsed.seen) return parsed;
  } catch { /* storage blocked or corrupt */ }
  return null;
};

const writeStore = (pageId, store) => {
  try {
    localStorage.setItem(storageKey(pageId), JSON.stringify({ baseline: store.baseline, seen: store.seen }));
  } catch { /* storage blocked or full: unread state lasts for this visit only */ }
};

/**
 * @returns {{ isUnread: (row: object) => boolean, markSeen: (conversationId: string) => void }}
 */
export function useInboxSeen(pageId) {
  // What storage held when the page was opened, or a new baseline of now.
  const initial = useMemo(() => {
    if (!pageId) return null;
    if (MOCK_MODE) return { baseline: MOCK_BASELINE, seen: readStore(pageId)?.seen || {} };
    return readStore(pageId) || { baseline: new Date().toISOString(), seen: {}, isNew: true };
  }, [pageId]);
  // Changes made this visit, by page.
  const [updates, setUpdates] = useState({});
  const store = (pageId && updates[pageId]) || initial;

  // Remember a new baseline so it holds across reloads.
  useEffect(() => {
    if (initial?.isNew) writeStore(pageId, initial);
  }, [initial, pageId]);

  const isUnread = (row) => {
    const last = row?.last_message;
    if (!store || !last || typeof last !== 'object' || last.role !== 'user') return false;
    const at = Date.parse(last.created_at || '');
    if (!at) return false;
    const conversationId = row.conversation_id || row.id;
    const seenAt = Math.max(Date.parse(store.baseline) || 0, Date.parse(store.seen[conversationId] || '') || 0);
    return at > seenAt;
  };

  const markSeen = useCallback((conversationId) => {
    if (!pageId || !conversationId || !initial) return;
    const now = new Date().toISOString();
    setUpdates(current => {
      const base = current[pageId] || initial;
      const entries = Object.entries({ ...base.seen, [conversationId]: now })
        .sort((a, b) => Date.parse(b[1]) - Date.parse(a[1]))
        .slice(0, MAX_ENTRIES);
      const next = { baseline: base.baseline, seen: Object.fromEntries(entries) };
      writeStore(pageId, next);
      return { ...current, [pageId]: next };
    });
  }, [initial, pageId]);

  return { isUnread, markSeen };
}
