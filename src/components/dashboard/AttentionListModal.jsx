import { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { apiService } from '../../services/api';
import { customerName } from '../../utils/customer';
import {
  dashboardErrorMessage,
  formatDateTime,
  formatHours,
  formatMinutes,
  formatMoney,
  handoverCategoryLabel,
} from '../../utils/ownerDashboard';

const PAGE_SIZE = 20;

// What each list loads and how a row reads. Rows are live, so pages are de-duplicated.
const LISTS = {
  waiting: {
    title: 'Waiting for a reply',
    subtitle: 'No reply from anyone for at least 15 minutes, longest wait first.',
    load: (cursor) => apiService.getDashboardAttentionList('waiting-for-reply', { cursor, pageSize: PAGE_SIZE }),
    key: row => row.conversation_id,
  },
  handovers: {
    title: 'Unanswered handovers',
    subtitle: 'Chats waiting for a person since the customer last wrote.',
    load: (cursor) => apiService.getDashboardAttentionList('unanswered-handovers', { cursor, pageSize: PAGE_SIZE }),
    key: row => row.conversation_id,
  },
  orders: {
    title: 'Unprocessed orders',
    subtitle: "Orders still marked new 24 hours after they came in, oldest first.",
    load: (cursor) => apiService.getDashboardAttentionList('unprocessed-orders', { cursor, pageSize: PAGE_SIZE }),
    key: row => row.customer_order_id,
  },
  comments: {
    title: 'Comments to review',
    subtitle: 'Comments the moderation agent flagged for you, newest first.',
    load: (cursor) => apiService.getComments({ execution_status: 'pending_review', page_size: PAGE_SIZE, cursor })
      .then(data => ({ items: data?.comments || [], pagination: data?.pagination })),
    key: row => row.id,
  },
};

/**
 * Every row behind an attention card. `onOpen(row)` acts on a row (opens the chat,
 * the order or the comment) and the parent closes the list.
 * @param {{ kind: 'waiting'|'handovers'|'orders'|'comments', timeZone?: string, currency?: string,
 *   onOpen: (row: object) => void, onClose: () => void }} props
 */
export default function AttentionListModal({ kind, timeZone, currency, onOpen, onClose }) {
  const list = LISTS[kind];
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | more | error
  const [error, setError] = useState('');
  const closeRef = useRef(null);

  const applyPage = useCallback((data, cursor) => {
    const items = Array.isArray(data?.items) ? data.items : [];
    setRows(current => {
      const base = cursor ? current : [];
      const seen = new Set(base.map(list.key));
      return [...base, ...items.filter(item => !seen.has(list.key(item)))];
    });
    setTotal(data?.pagination?.total ?? null);
    setNextCursor(data?.pagination?.has_more ? data.pagination.next_cursor : null);
    setStatus('ready');
  }, [list]);

  const failPage = useCallback((requestError) => {
    setError(dashboardErrorMessage(requestError));
    setStatus('error');
  }, []);

  // "Show more" and "Try again".
  const load = (cursor = null) => {
    setStatus(cursor ? 'more' : 'loading');
    setError('');
    list.load(cursor).then(data => applyPage(data, cursor), failPage);
  };

  useEffect(() => {
    list.load(null).then(data => applyPage(data, null), failPage);
  }, [applyPage, failPage, list]);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const renderRow = (row) => {
    if (kind === 'orders') {
      return (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-slate-900">{customerName(row.customer_name)} <span className="font-medium text-slate-500">· {row.order_id}</span></span>
            <span className="block text-[12px] text-slate-500">
              {formatMoney(row.total, currency)} · placed {formatDateTime(row.created_at, timeZone)}
              {row.missing_contact && <span className="ml-1.5 font-semibold text-amber-700">· No phone or address</span>}
            </span>
          </span>
          <span className="shrink-0 text-[12px] font-semibold text-slate-600">{formatHours(row.age_hours)} old</span>
        </>
      );
    }
    if (kind === 'comments') {
      return (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-slate-900">{row.commenter_name}</span>
            <span className="block truncate text-[12px] text-slate-500">{row.comment_text}</span>
          </span>
          <span className="shrink-0 text-[12px] font-semibold text-slate-600">{formatDateTime(row.created_at, timeZone)}</span>
        </>
      );
    }
    return (
      <>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-slate-900">{customerName(row.customer_name)}</span>
          {kind === 'handovers' && (
            <span className="block truncate text-[12px] text-slate-500">
              {handoverCategoryLabel(row.category) || 'Paused or no category'} · {row.assigned_to_name || 'Unassigned'}
            </span>
          )}
        </span>
        <span className="shrink-0 text-[12px] font-semibold text-slate-600">waiting {formatMinutes(row.waiting_minutes)}</span>
      </>
    );
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9990] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="attention-list-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="attention-list-title" className="m-0 text-[16px] font-semibold text-slate-900">
              {list.title}{total !== null ? ` (${total})` : ''}
            </h2>
            <p className="mb-0 mt-0.5 text-[12.5px] text-slate-500">{list.subtitle}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {status === 'loading' && <p className="px-3 py-6 text-center text-[13px] text-slate-500">Loading…</p>}
          {status !== 'loading' && rows.length === 0 && !error && (
            <p className="px-3 py-6 text-center text-[13px] text-slate-500">Nothing here right now.</p>
          )}
          <ul className="m-0 list-none p-0">
            {rows.map(row => (
              <li key={list.key(row)}>
                <button
                  type="button"
                  onClick={() => onOpen(row)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  {renderRow(row)}
                </button>
              </li>
            ))}
          </ul>
          {error && (
            <div className="px-3 py-4 text-center text-[13px] text-rose-700">
              {error}{' '}
              <button type="button" onClick={() => load(rows.length ? nextCursor : null)} className="font-semibold underline underline-offset-2">Try again</button>
            </div>
          )}
          {nextCursor && !error && (
            <div className="px-3 py-2">
              <button
                type="button"
                onClick={() => load(nextCursor)}
                disabled={status === 'more'}
                className="h-9 w-full rounded-lg border border-solid border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {status === 'more' ? 'Loading…' : 'Show more'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
