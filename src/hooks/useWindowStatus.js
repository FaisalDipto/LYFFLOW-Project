import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../services/api';

/**
 * Meta's reply windows for one conversation (GET .../window-status). Reloads when the
 * conversation changes or `refreshKey` is bumped; `update` takes the fresher
 * `window_status` a reply response carries, so sending doesn't need another request.
 *
 * @returns {{ status: 'idle'|'loading'|'ready'|'error', data: object|null, update: (data: object) => void }}
 */
export function useWindowStatus(pageId, conversationId, refreshKey = 0) {
  // The last response, tagged with the request it answers.
  const [result, setResult] = useState(null);
  const requestKey = `${pageId}:${conversationId}:${refreshKey}`;

  useEffect(() => {
    if (!pageId || !conversationId) return undefined;
    let cancelled = false;
    apiService.getConversationWindowStatus(pageId, conversationId)
      .then(data => { if (!cancelled) setResult({ key: requestKey, data, error: false }); })
      .catch(error => {
        if (cancelled) return;
        console.error('Failed to load the messaging window:', error);
        setResult({ key: requestKey, data: null, error: true });
      });
    return () => { cancelled = true; };
  }, [pageId, conversationId, requestKey]);

  const update = useCallback((data) => {
    if (data) setResult({ key: requestKey, data, error: false });
  }, [requestKey]);

  if (!pageId || !conversationId) return { status: 'idle', data: null, update };
  if (result?.key !== requestKey) return { status: 'loading', data: null, update };
  return { status: result.error ? 'error' : 'ready', data: result.data, update };
}
