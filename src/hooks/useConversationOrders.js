import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

const errorMessage = (error) => {
  if (error?.status === 403) return 'This conversation is not in the active business.';
  if (error?.status === 404) return 'Conversation not found.';
  return 'Could not load orders.';
};

/**
 * Orders placed in one conversation, newest first (up to the endpoint's 50).
 * Reloads when the conversation changes or `refreshKey` is bumped; while a reload of
 * the same conversation is in flight the previous list is kept.
 *
 * @returns {{ status: 'idle'|'loading'|'ready'|'error', orders: object[], error: string }}
 */
export function useConversationOrders(conversationId, refreshKey = 0) {
  // The last response, tagged with the request it answers.
  const [result, setResult] = useState(null);
  const requestKey = `${conversationId}:${refreshKey}`;

  useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;
    apiService.getConversationOrders(conversationId)
      .then(response => {
        if (!cancelled) setResult({ key: requestKey, conversationId, orders: Array.isArray(response) ? response : [], error: '' });
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Failed to load conversation orders:', error);
        setResult({ key: requestKey, conversationId, orders: [], error: errorMessage(error) });
      });
    return () => { cancelled = true; };
  }, [conversationId, requestKey]);

  if (!conversationId) return { status: 'idle', orders: [], error: '' };
  const current = result?.conversationId === conversationId ? result : null;
  if (!current || (current.key !== requestKey && current.orders.length === 0)) {
    return { status: 'loading', orders: [], error: '' };
  }
  return { status: current.error ? 'error' : 'ready', orders: current.orders, error: current.error };
}
