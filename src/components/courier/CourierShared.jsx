import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, KeyRound, Loader2, Mail, Phone, ShoppingCart, X } from 'lucide-react';
import { apiService } from '../../services/api';

const INPUT_CLASS = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500';

export const CourierPageHeader = ({ icon, title, description, children }) => {
  const Icon = icon;
  return (
    <div className="p-6 md:p-8 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Icon className="text-emerald-500" />
          {title}
        </h2>
        <p className="text-slate-500 text-sm mt-1">{description}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
};

export const Notice = ({ tone = 'error', children }) => {
  const isError = tone === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-medium ${isError
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-emerald-300 bg-emerald-100/70 text-emerald-900'
      }`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
};

export const Field = ({ label, required, hint, className = '', children }) => (
  <label className={`block ${className}`}>
    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
      {label}{required && <span className="text-red-500"> *</span>}
    </span>
    {children}
    {hint && <span className="mt-1 block text-[11px] font-medium text-slate-400">{hint}</span>}
  </label>
);

export const TextInput = (props) => <input {...props} className={INPUT_CLASS} />;
export const TextArea = (props) => <textarea rows={2} {...props} className={INPUT_CLASS} />;
export const SelectInput = ({ children, ...props }) => <select {...props} className={INPUT_CLASS}>{children}</select>;

export const PrimaryButton = ({ loading, children, className = '', ...props }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    {loading && <Loader2 size={16} className="animate-spin" />}
    {children}
  </button>
);

export const SecondaryButton = ({ loading, children, className = '', ...props }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className={`inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    {loading && <Loader2 size={16} className="animate-spin" />}
    {children}
  </button>
);

export const Card = ({ title, description, icon: Icon, action, children, className = '' }) => (
  <section className={`bg-white border border-slate-200 rounded-3xl shadow-sm ${className}`}>
    <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Icon size={20} />
          </span>
        )}
        <div>
          <h3 className="text-base font-black text-slate-800">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

// Shows a list of label/value pairs, e.g. a placed consignment.
export const DetailGrid = ({ items }) => (
  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {items.map(([label, value]) => (
      <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <dt className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</dt>
        <dd className="mt-1 break-words text-sm font-semibold text-slate-700">{value === null || value === undefined || value === '' ? 'Not provided' : value}</dd>
      </div>
    ))}
  </dl>
);

/**
 * Connect/reconnect form for a courier account. After a successful connect it shows the
 * webhook URL and auth token the merchant must paste into the courier's panel.
 */
export const CourierConnectCard = ({ courierName, fields, onConnect, webhookHelp }) => {
  const emptyValues = Object.fromEntries(fields.map(field => [field.name, '']));
  const [values, setValues] = useState(emptyValues);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    const missing = fields.find(field => !trimmed[field.name]);
    if (missing) {
      setError(`Enter your ${courierName} ${missing.label.toLowerCase()}.`);
      return;
    }

    setConnecting(true);
    setError('');
    setConnection(null);
    try {
      const response = await onConnect(trimmed);
      setConnection(response);
      // Never keep secrets in state after they have been sent.
      setValues(current => Object.fromEntries(Object.entries(current).map(([key, value]) => [
        key,
        fields.find(field => field.name === key)?.secret ? '' : value,
      ])));
    } catch (err) {
      setError(err.message || `Could not connect your ${courierName} account.`);
    } finally {
      setConnecting(false);
    }
  };

  const copyValue = async (field, value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 1800);
    } catch {
      setError('Could not copy automatically. Select the value and copy it manually.');
    }
  };

  return (
    <Card
      icon={KeyRound}
      title={`Connect ${courierName}`}
      description={`Connect or reconnect your ${courierName} merchant account.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map(field => (
            <Field key={field.name} label={field.label} required hint={field.hint}>
              <TextInput
                type={field.type || 'text'}
                autoComplete={field.autoComplete || 'off'}
                value={values[field.name]}
                onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))}
                placeholder={field.placeholder}
                disabled={connecting}
                required
              />
            </Field>
          ))}
        </div>

        <p className="text-xs text-slate-400">Your credentials are sent securely to LYFFLOW and are not saved in this browser.</p>

        {error && <Notice>{error}</Notice>}

        <div className="flex justify-end">
          <PrimaryButton type="submit" loading={connecting}>
            {connecting ? 'Connecting...' : `Connect ${courierName}`}
          </PrimaryButton>
        </div>
      </form>

      {connection && (
        <div className="mt-5 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
          <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
            <CheckCircle2 size={18} /> {connection.message || `${courierName} connected successfully`}
          </p>
          <p className="text-xs text-slate-500">{webhookHelp} Keep the authentication token private.</p>
          {[
            ['webhook', 'Webhook URL', connection.webhook_url],
            ['token', 'Authentication token', connection.auth_token],
          ].map(([field, label, value]) => (
            <div key={field}>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
              <div className="mt-1 flex items-stretch gap-2">
                <code className="min-w-0 flex-1 break-all rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs text-slate-700">
                  {value || 'Not returned by the server'}
                </code>
                <button
                  type="button"
                  onClick={() => copyValue(field, value)}
                  disabled={!value}
                  className="min-w-[66px] rounded-lg border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copiedField === field ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const parseAmount = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : Number(String(val).trim());
  return Number.isFinite(num) ? num : null;
};

const formatAmount = (val) => {
  const num = parseAmount(val);
  if (num === null) return '—';
  if (Math.abs(num) > 1e11) return `$${num.toExponential(2)}`;
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const normalizeOrder = (order) => ({ ...order, id: order.customer_order_id || order.order_id });

/** Customer orders for one page, each with a button to ship it with the courier. */
export const CourierOrderList = ({ pages, courierName, onShip }) => {
  const [chosenPageId, setChosenPageId] = useState('');
  // Default to the first connected page until the user picks one.
  const pageId = chosenPageId || pages?.[0]?.page_id || '';
  const [orders, setOrders] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedPageId, setLoadedPageId] = useState(null);
  const [isPaginating, setIsPaginating] = useState(false);
  const [error, setError] = useState('');
  const isLoading = Boolean(pageId) && loadedPageId !== pageId;

  const fetchOrders = useCallback(async (cursor = null) => {
    if (!pageId) return;
    try {
      const response = await apiService.getCustomerOrders({ page_id: pageId, cursor, page_size: 20 });
      const data = response?.data || response;
      const collection = data?.orders || data?.customer_orders;
      const nextOrders = Array.isArray(collection) ? collection.map(normalizeOrder) : [];
      setOrders(prev => cursor ? [...prev, ...nextOrders] : nextOrders);
      setNextCursor(data?.pagination?.next_cursor || null);
      setHasMore(Boolean(data?.pagination?.has_more));
      setError('');
    } catch (err) {
      console.error('Failed to fetch customer orders:', err);
      if (!cursor) setOrders([]);
      setError(err.message || 'Could not load customer orders.');
    } finally {
      setLoadedPageId(pageId);
      setIsPaginating(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const loadMore = () => {
    setIsPaginating(true);
    fetchOrders(nextCursor);
  };

  return (
    <Card
      icon={ShoppingCart}
      title="Ship customer orders"
      description={`Pick an order captured by your AI agent and send it to ${courierName}.`}
      action={(
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <select
            aria-label="Select a page"
            value={pageId}
            onChange={event => setChosenPageId(event.target.value)}
            className="cursor-pointer border-none bg-transparent p-0 pl-1 pr-8 text-sm font-bold text-slate-700 outline-none focus:ring-0"
          >
            {!pages?.length && <option value="">No pages connected</option>}
            {pages?.map(page => (
              <option key={page.page_id} value={page.page_id}>{page.name}</option>
            ))}
          </select>
        </div>
      )}
    >
      {!pageId ? (
        <EmptyState>Connect a Facebook page to start capturing orders.</EmptyState>
      ) : isLoading ? (
        <div className="flex h-48 flex-col items-center justify-center text-slate-400">
          <Loader2 className="mb-3 animate-spin" size={28} />
          <p>Loading orders...</p>
        </div>
      ) : error && orders.length === 0 ? (
        <Notice>{error}</Notice>
      ) : orders.length === 0 ? (
        <EmptyState>No orders found for this page yet.</EmptyState>
      ) : (
        <div className="-mx-5 -mb-5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Source</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Total</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="p-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(order => (
                  <tr key={order.id} className="group transition-colors hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{order.contact_name || 'Unknown customer'}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                          {order.contact_phone && <><Phone size={12} /> {order.contact_phone}</>}
                          {order.contact_phone && order.contact_email && <span className="mx-1">{'•'}</span>}
                          {order.contact_email && <><Mail size={12} /> {order.contact_email}</>}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {order.created_by?.toLowerCase() === 'ai' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                          AI
                        </span>
                      ) : order.created_by ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                          {order.created_by}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-bold text-slate-800">
                        {formatAmount(order.total)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">
                        {order.status?.replaceAll('_', ' ') || 'unknown'}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-500">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => onShip(order)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        Ship <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="flex justify-center border-t border-slate-100 bg-slate-50/50 p-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={isPaginating}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-600"
              >
                {isPaginating ? <Loader2 className="animate-spin" size={16} /> : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const EmptyState = ({ children }) => (
  <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-slate-400">
    <ShoppingCart className="mb-3 opacity-20" size={40} />
    <p className="font-medium text-slate-500">{children}</p>
  </div>
);

export const CourierModal = ({ title, subtitle, onClose, children, footer }) => (
  <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in sm:p-6">
    <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-scale-in">
      <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/50 p-6 md:p-8">
        <div>
          <h3 className="text-xl font-black text-slate-800">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-6 md:p-8">{children}</div>
      {footer && <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white p-6 md:p-8">{footer}</div>}
    </div>
  </div>
);
