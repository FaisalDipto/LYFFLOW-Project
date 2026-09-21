/**
 * Single Server-Sent Events connection for notifications, shared by the whole app.
 *
 * EventSource cannot go through `apiFetch` — it takes a URL string and has no
 * interceptors — so the absolute URL is built here from the same `API_BASE` the
 * API client uses, which keeps dev and production working off one build.
 *
 * Browsers cap concurrent connections per origin, so the connection is a module
 * singleton with a subscriber count: the first subscriber opens it, the last one
 * closes it, no matter how many components are mounted.
 */

import { API_BASE } from '../config/env';

const STREAM_PATH = '/v1/notifications/stream';

// EventSource reconnects by itself and would otherwise retry forever against an
// expired session. Give up after a few consecutive failures and let the app decide.
const MAX_CONSECUTIVE_FAILURES = 4;

// StrictMode mounts effects twice; deferring the close keeps that from
// tearing down and re-opening the connection on every mount.
const CLOSE_DELAY_MS = 250;

const subscribers = new Set();

let source = null;
let consecutiveFailures = 0;
let closeTimer = null;

const emit = (event, payload) => {
  subscribers.forEach(subscriber => {
    try {
      subscriber[event]?.(payload);
    } catch (error) {
      console.error(`[notifications] subscriber ${event} handler failed`, error);
    }
  });
};

const closeSource = () => {
  if (!source) return;
  source.close();
  source = null;
};

const openSource = () => {
  if (source) return;

  emit('onStatus', 'connecting');
  const es = new EventSource(`${API_BASE}${STREAM_PATH}`, { withCredentials: true });
  source = es;

  es.addEventListener('ready', () => {
    consecutiveFailures = 0;
    emit('onStatus', 'live');
    // The server does not replay missed events, so every subscriber refetches.
    emit('onReady');
  });

  es.addEventListener('notification', event => {
    let notification = null;
    try {
      notification = JSON.parse(event.data);
    } catch (error) {
      console.warn('[notifications] could not parse a pushed notification', error);
      return;
    }
    emit('onNotification', notification);
  });

  es.onerror = () => {
    // Fires once per failed attempt, including the browser's own retries.
    if (source !== es) return;
    consecutiveFailures += 1;

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      closeSource();
      emit('onStatus', 'offline');
      emit('onGiveUp');
      return;
    }

    emit('onStatus', 'connecting');
  };
};

/**
 * @param {{ onNotification?: Function, onReady?: Function, onStatus?: Function, onGiveUp?: Function }} handlers
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

/** Reopen after the connection gave up (manual retry, or a recovered session). */
export const reconnectNotificationStream = () => {
  consecutiveFailures = 0;
  closeSource();
  if (subscribers.size > 0) openSource();
};

/** Tear the connection down — on logout, or when the last subscriber unmounts. */
export const closeNotificationStream = () => {
  consecutiveFailures = 0;
  closeSource();
  emit('onStatus', 'offline');
};
