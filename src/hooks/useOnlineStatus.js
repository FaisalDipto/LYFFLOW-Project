import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../services/api';

const MOCK_EXPIRY = typeof window !== 'undefined' && /[?&]mockPresence=expired\b/.test(window.location.search);
// "Still here" every 5 minutes while online; the backend puts a member offline after 11
// minutes without one. (Mock ?mockPresence=expired beats every 15 s to show that sooner.)
const HEARTBEAT_MS = MOCK_EXPIRY ? 15000 : 5 * 60000;
const CHANNEL = 'lyfflow-online-status';

const openChannel = () => {
  try { return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL); } catch { return null; }
};

/**
 * The signed-in member's online status in the active business. Sends the heartbeat on
 * load (it reports the current status), every 5 minutes while online, and when the tab
 * comes back into view. A heartbeat never puts anyone online: one that answers offline
 * while we show online means the backend timed the member out, so `wasTimedOut` is set
 * and the member goes online again with setOnline(true). Other tabs follow a change.
 *
 * status: 'loading' | 'ready' | 'unavailable' (the API has no presence endpoints).
 */
const INITIAL = { status: 'loading', isOnline: false, onlineSince: null, busy: false, wasTimedOut: false, error: null };

export function useOnlineStatus(businessId) {
  // Kept per business: another business starts from INITIAL until its first answer.
  const [stored, setStored] = useState({ businessId: null, ...INITIAL });
  const state = stored.businessId === businessId ? stored : { businessId, ...INITIAL };
  const setState = useCallback((update) => setStored(prev => {
    const base = prev.businessId === businessId ? prev : { businessId, ...INITIAL };
    return typeof update === 'function' ? update(base) : { businessId, ...update };
  }), [businessId]);
  const onlineRef = useRef(false);
  // A heartbeat sent before the latest change answers for the old status; ignore it.
  const versionRef = useRef(0);
  const channelRef = useRef(null);

  const apply = useCallback((reply, extra = {}) => {
    const isOnline = Boolean(reply?.is_online);
    onlineRef.current = isOnline;
    setState(prev => ({ ...prev, status: 'ready', isOnline, onlineSince: isOnline ? reply?.online_since || null : null, ...extra }));
  }, [setState]);

  const beat = useCallback(async () => {
    const version = versionRef.current;
    try {
      const reply = await apiService.sendOnlineHeartbeat();
      if (version !== versionRef.current) return;
      const timedOut = onlineRef.current && !reply?.is_online;
      apply(reply, timedOut ? { wasTimedOut: true } : {});
    } catch (error) {
      if (version !== versionRef.current) return;
      // 404/405: an API without presence; hide the control. Anything else (429, 500, a
      // network blip): keep what we show, and the next beat tries again.
      if (error?.status === 404 || error?.status === 405) setState(prev => ({ ...prev, status: 'unavailable' }));
      else setState(prev => (prev.status === 'loading' ? { ...prev, status: 'ready' } : prev));
    }
  }, [apply, setState]);

  // On load, and for a new business: its own status.
  useEffect(() => {
    if (!businessId) return;
    versionRef.current += 1;
    onlineRef.current = false;
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) beat(); });
    return () => { cancelled = true; };
  }, [businessId, beat]);

  useEffect(() => {
    if (!businessId || !state.isOnline) return undefined;
    const timer = setInterval(beat, HEARTBEAT_MS);
    // Back from a hidden tab or a sleeping laptop: check at once, it may have timed out.
    const handleVisible = () => { if (document.visibilityState === 'visible') beat(); };
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [businessId, state.isOnline, beat]);

  // Another tab of the same business went online or offline.
  useEffect(() => {
    if (!businessId) return undefined;
    const channel = openChannel();
    channelRef.current = channel;
    if (!channel) return undefined;
    channel.onmessage = (event) => {
      if (event.data?.businessId !== businessId) return;
      versionRef.current += 1;
      apply(event.data.reply, { wasTimedOut: false, error: null });
    };
    return () => { channel.close(); channelRef.current = null; };
  }, [businessId, apply]);

  const setOnline = useCallback(async (next) => {
    versionRef.current += 1;
    setState(prev => ({ ...prev, busy: true, error: null }));
    try {
      const reply = await apiService.setMyOnlineStatus(next);
      versionRef.current += 1;
      apply(reply, { busy: false, wasTimedOut: false });
      try { channelRef.current?.postMessage({ businessId, reply }); } catch { /* other tabs catch up on their next beat */ }
    } catch (error) {
      const text = error?.status === 429 ? 'Too many changes. Wait a moment, then try again.'
        : error?.status === 403 ? "You're not a member of this business anymore."
          : `Couldn't go ${next ? 'online' : 'offline'}. Try again.`;
      setState(prev => ({ ...prev, busy: false, error: text }));
    }
  }, [apply, businessId, setState]);

  const dismissTimeout = useCallback(() => setState(prev => ({ ...prev, wasTimedOut: false, error: null })), [setState]);

  const { businessId: _ignored, ...current } = state;
  return { ...current, setOnline, dismissTimeout };
}
