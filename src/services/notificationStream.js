/**
 * Single Server-Sent Events connection for notifications and the live inbox, shared
 * by the whole app.
 *
 * EventSource cannot go through `apiFetch` — it takes a URL string and has no
 * interceptors — so the absolute URL is built here from the same `API_BASE` the
 * API client uses, which keeps dev and production working off one build.
 *
 * Browsers cap concurrent connections per origin, so the connection is a module
 * singleton with a subscriber count: the first subscriber opens it, the last one
 * closes it, no matter how many components are mounted.
 *
 * Events: `ready` (after every connect: refetch, nothing is replayed), `notification`,
 * `inbox_message`, `message_update` and `conversation_update`.
 */

import { API_BASE } from '../config/env';

const STREAM_PATH = '/v1/notifications/stream';
const PROBE_PATH = '/v1/notifications/unread-count';

// Pushed event name -> subscriber handler.
const STREAM_EVENTS = {
  notification: 'onNotification',
  inbox_message: 'onInboxMessage',
  message_update: 'onMessageUpdate',
  conversation_update: 'onConversationUpdate',
};

// Reconnect back-off after the server closed the stream with a non-200 (a deploy's 502).
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

// StrictMode mounts effects twice; deferring the close keeps that from
// tearing down and re-opening the connection on every mount.
const CLOSE_DELAY_MS = 250;

// Mock mode has no server: a stand-in source answers `ready` and replays frames the
// mock API dispatches as `lyfflow-mock-stream` window events.
const MOCK_MODE = typeof window !== 'undefined' && window.location.search.includes('mock=true');
export const MOCK_STREAM_EVENT = 'lyfflow-mock-stream';

const subscribers = new Set();

let source = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let closeTimer = null;
// Set on logout or lost access: no reconnects until something reopens it on purpose.
let stopped = false;

const emit = (event, payload) => {
  subscribers.forEach(subscriber => {
    try {
      subscriber[event]?.(payload);
    } catch (error) {
      console.error(`[notifications] subscriber ${event} handler failed`, error);
    }
  });
};

const clearReconnect = () => {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
};

const closeSource = () => {
  clearReconnect();
  if (!source) return;
  source.close();
  source = null;
};

const createMockSource = () => {
  const target = new EventTarget();
  const relay = (event) => {
    const { event: name, data } = event.detail || {};
    if (name) target.dispatchEvent(new MessageEvent(name, { data: JSON.stringify(data) }));
  };
  const readyTimer = setTimeout(() => {
    target.readyState = 1;
    target.dispatchEvent(new MessageEvent('ready', { data: JSON.stringify({ channel: 'mock' }) }));
  }, 50);
  window.addEventListener(MOCK_STREAM_EVENT, relay);
  target.readyState = 0;
  target.close = () => {
    clearTimeout(readyTimer);
    window.removeEventListener(MOCK_STREAM_EVENT, relay);
    target.readyState = 2;
  };
  return target;
};

const shouldBeOpen = () => subscribers.size > 0 && !stopped
  && (typeof document === 'undefined' || document.visibilityState !== 'hidden');

const scheduleReconnect = () => {
  clearReconnect();
  const ceiling = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** reconnectAttempts);
  reconnectAttempts += 1;
  // Full jitter, so every tab does not come back at the same moment after a deploy.
  const delay = Math.round(ceiling / 2 + Math.random() * (ceiling / 2));
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (shouldBeOpen()) openSource();
  }, delay);
};

// EventSource never retries after a non-200. A cheap authenticated call tells a
// logout or lost business (stop) from a restarting API (reconnect).
const handleClosedByServer = async () => {
  let status = 0;
  try {
    const response = await fetch(`${API_BASE}${PROBE_PATH}`, { credentials: 'include' });
    status = response.status;
  } catch {
    // Network down: keep trying with back-off.
  }
  if (!shouldBeOpen() || source) return;
  if (status === 401 || status === 403) {
    stopped = true;
    emit('onStatus', 'offline');
    emit('onGiveUp', { status });
    return;
  }
  emit('onStatus', 'connecting');
  scheduleReconnect();
};

const openSource = () => {
  if (source || !shouldBeOpen()) return;
  clearReconnect();

  emit('onStatus', 'connecting');
  const es = MOCK_MODE ? createMockSource() : new EventSource(`${API_BASE}${STREAM_PATH}`, { withCredentials: true });
  source = es;

  es.addEventListener('ready', () => {
    if (source !== es) return;
    reconnectAttempts = 0;
    emit('onStatus', 'live');
    // The server does not replay missed events, so every subscriber refetches.
    emit('onReady');
  });

  Object.entries(STREAM_EVENTS).forEach(([name, handler]) => {
    es.addEventListener(name, event => {
      if (source !== es) return;
      let payload = null;
      try {
        payload = JSON.parse(event.data);
      } catch (error) {
        console.warn(`[notifications] could not parse a pushed ${name}`, error);
        return;
      }
      emit(handler, payload);
    });
  });

  es.onerror = () => {
    if (source !== es) return;
    // Still CONNECTING: the browser is retrying by itself (including the server's
    // planned ~15 minute recycle, and its `retry: 30000` back-off).
    if (es.readyState !== 2) {
      emit('onStatus', 'connecting');
      return;
    }
    source = null;
    emit('onStatus', 'connecting');
    handleClosedByServer();
  };
};

// Hidden tabs drop the connection (battery, and the 6-per-host limit); the `ready`
// refetch on return heals the gap.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (source || reconnectTimer) {
        closeSource();
        emit('onStatus', 'paused');
      }
      return;
    }
    if (shouldBeOpen()) {
      reconnectAttempts = 0;
      openSource();
    }
  });
}

/**
 * @param {{ onNotification?: Function, onInboxMessage?: Function, onMessageUpdate?: Function,
 *   onConversationUpdate?: Function, onReady?: Function, onStatus?: Function, onGiveUp?: Function }} handlers
 * @returns {() => void} unsubscribe
 */
export const subscribeToNotificationStream = handlers => {
  subscribers.add(handlers);

  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  openSource();

  return () => {
    subscribers.delete(handlers);
    if (subscribers.size > 0) return;
    closeTimer = setTimeout(() => {
      closeTimer = null;
      if (subscribers.size === 0) closeNotificationStream();
    }, CLOSE_DELAY_MS);
  };
};

/** Reopen after the connection stopped (manual retry, or a recovered session). */
export const reconnectNotificationStream = () => {
  stopped = false;
  reconnectAttempts = 0;
  closeSource();
  openSource();
};

/**
 * Tear the connection down: on logout, on a business switch (the stream is bound to
 * the business active when it opened), or when the last subscriber unmounts.
 */
export const closeNotificationStream = () => {
  reconnectAttempts = 0;
  closeSource();
  // The next subscriber (a new dashboard mount after a switch) opens a fresh one.
  stopped = false;
  emit('onStatus', 'offline');
};
