import { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Check, Copy, Eye, EyeOff, KeyRound, Loader2, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { apiService } from '../../services/api';

/**
 * @typedef {Object} ApiKeyItem
 * @property {string} api_key_id
 * @property {string} name
 * @property {string} key_prefix
 * @property {string} permissions   Comma-separated scopes, e.g. "products:read,orders:read".
 * @property {boolean} is_active    False once revoked.
 * @property {string|null} last_used_at
 * @property {string} created_at
 *
 * @typedef {Object} CreateApiKeyPayload
 * @property {string} name          1-100 characters.
 * @property {string} permissions   Comma-separated scopes, at most 200 characters.
 *
 * @typedef {Object} CreateApiKeyResponse
 * @property {string} api_key_id
 * @property {string} name
 * @property {string} key           The full key. Returned once, never again.
 * @property {string} key_prefix
 * @property {string} created_at
 *
 * @typedef {Object} ValidateApiKeyResponse
 * @property {boolean} valid
 * @property {string} api_key_id
 * @property {string} name
 * @property {string[]} permissions
 * @property {string} created_at
 */

// The scopes the API accepts, in the order they're offered.
const SCOPES = [
  { value: 'products:read', label: 'Read products', hint: 'List and look up catalog items' },
  { value: 'products:write', label: 'Write products', hint: 'Create, update and delete catalog items' },
  { value: 'orders:read', label: 'Read orders', hint: 'List orders and their details' },
  { value: 'namespaces:read', label: 'Read catalogs', hint: 'List the product catalogs in this business' },
];

const parseScopes = (permissions) => String(permissions || '').split(',').map(scope => scope.trim()).filter(Boolean);

// FastAPI sends naive UTC datetimes without an offset; read them as UTC, not local time.
const parseTimestamp = (value) => {
  if (!value) return null;
  const text = String(value);
  const date = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(text) || !text.includes('T') ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = parseTimestamp(value);
  return date ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
};

const formatDateTime = (value) => {
  const date = parseTimestamp(value);
  return date ? date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
};

// Active keys first, then newest first.
const sortKeys = (items) => [...items].sort((a, b) => (
  Number(b.is_active) - Number(a.is_active) || (parseTimestamp(b.created_at) || 0) - (parseTimestamp(a.created_at) || 0)
));

const useCopy = () => {
  const [copied, setCopied] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(async (text, id = text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 1800);
      return true;
    } catch {
      return false;
    }
  }, []);
  return { copied, copy };
};

const ScopeBadge = ({ scope }) => (
  <span className="api-key-scope inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
    {scope}
  </span>
);

const StatusPill = ({ active }) => (
  <span className={`api-key-status inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'is-active bg-emerald-50 text-emerald-700' : 'is-revoked bg-slate-100 text-slate-500'}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} style={{ borderRadius: 9999 }} aria-hidden="true" />
    {active ? 'Active' : 'Revoked'}
  </span>
);

// Shared shell for the dialogs. `dismissible` false keeps backdrop clicks and Escape
// from closing it, for steps where an accidental close would lose something.
const Dialog = ({ labelledBy, onClose, dismissible = true, children }) => {
  useEffect(() => {
    if (!dismissible) return undefined;
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dismissible, onClose]);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in" onClick={dismissible ? onClose : undefined}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={event => event.stopPropagation()}
        className="api-keys-dialog relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-2xl animate-scale-in"
      >
        {dismissible && (
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X size={16} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
};

const CreateKeyDialog = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState(() => SCOPES.map(scope => scope.value));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Holds the one-time response. Lives only in this dialog, so closing it drops the key.
  const [created, setCreated] = useState(/** @type {CreateApiKeyResponse|null} */ (null));
  const { copied, copy } = useCopy();
  const [copyFailed, setCopyFailed] = useState(false);

  const toggleScope = (value) => setScopes(current => (
    current.includes(value) ? current.filter(scope => scope !== value) : [...current, value]
  ));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || scopes.length === 0) return;
    setSubmitting(true);
    setError('');
    // Serialised in the canonical order, whatever order the boxes were ticked in.
    const permissions = SCOPES.map(scope => scope.value).filter(value => scopes.includes(value)).join(',');
    try {
      const response = await apiService.createApiKey({ name: trimmed, permissions });
      setCreated(response);
      onCreated({
        api_key_id: response.api_key_id,
        name: response.name,
        key_prefix: response.key_prefix,
        permissions,
        is_active: true,
        last_used_at: null,
        created_at: response.created_at,
      });
    } catch (err) {
      setError(err.message || 'Could not create the key.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCreated(null);
    onClose();
  };

  if (created) {
    return (
      <Dialog labelledBy="api-key-created-title" onClose={handleClose} dismissible={false}>
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <KeyRound size={18} />
        </span>
        <h2 id="api-key-created-title" className="m-0 text-lg font-semibold text-slate-900">Key created</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">{created.name}</p>

        <div className="api-key-warning mb-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900" role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p className="m-0">Please copy this key now. For security purposes, you will not be able to view it again.</p>
        </div>

        <label htmlFor="api-key-secret" className="mb-1.5 block text-xs font-medium text-slate-600">Your API key</label>
        <textarea
          id="api-key-secret"
          readOnly
          rows={2}
          value={created.key}
          onFocus={event => event.target.select()}
          spellCheck={false}
          className="api-key-secret block w-full resize-none break-all rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-mono text-[13px] leading-relaxed text-slate-900"
        />
        {copyFailed && <p className="mb-0 mt-2 text-xs text-red-600">Copy didn't work in this browser. Select the key and copy it manually.</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Done
          </button>
          <button
            type="button"
            onClick={async () => setCopyFailed(!(await copy(created.key, 'secret')))}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {copied === 'secret' ? <Check size={16} /> : <Copy size={16} />}
            {copied === 'secret' ? 'Copied' : 'Copy key'}
          </button>
        </div>
      </Dialog>
    );
  }

  const canSubmit = name.trim().length > 0 && scopes.length > 0 && !submitting;

  return (
    <Dialog labelledBy="api-key-create-title" onClose={submitting ? () => {} : handleClose}>
      <form onSubmit={handleSubmit}>
        <h2 id="api-key-create-title" className="m-0 text-lg font-semibold text-slate-900">Create API key</h2>
        <p className="mb-5 mt-1 text-sm text-slate-500">Keys let a plugin or script work with this business's products and orders.</p>

        <label htmlFor="api-key-name" className="mb-1.5 block text-xs font-medium text-slate-600">Name</label>
        <input
          id="api-key-name"
          type="text"
          required
          autoFocus
          maxLength={100}
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="e.g. WooCommerce plugin"
          className="mb-5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
        />

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 block p-0 text-xs font-medium text-slate-600">Permissions</legend>
          <div className="grid gap-2">
            {SCOPES.map(scope => {
              const checked = scopes.includes(scope.value);
              return (
                <label key={scope.value} className={`api-key-scope-option flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors ${checked ? 'is-checked border-emerald-300 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleScope(scope.value)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{scope.label}</span>
                    <span className="block text-xs text-slate-500">{scope.hint} · <span className="font-mono">{scope.value}</span></span>
                  </span>
                </label>
              );
            })}
          </div>
          {scopes.length === 0 && <p className="mb-0 mt-2 text-xs text-red-600">Choose at least one permission.</p>}
        </fieldset>

        {error && <p className="mb-0 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={submitting} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Creating…' : 'Create key'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};

const RevokeKeyDialog = ({ apiKey, onClose, onRevoke }) => {
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState('');

  const handleRevoke = async () => {
    setRevoking(true);
    setError('');
    try {
      await onRevoke(apiKey);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not revoke the key.');
      setRevoking(false);
    }
  };

  return (
    <Dialog labelledBy="api-key-revoke-title" onClose={revoking ? () => {} : onClose}>
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <AlertTriangle size={18} />
      </span>
      <h2 id="api-key-revoke-title" className="m-0 text-lg font-semibold text-slate-900">Revoke "{apiKey.name}"?</h2>
      <p className="mb-0 mt-2 text-sm leading-6 text-slate-500">
        Any app or script using this key will be disconnected immediately, and its requests will start failing. Revoking can't be undone; create a new key to reconnect.
      </p>
      {error && <p className="mb-0 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={revoking} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={handleRevoke} disabled={revoking} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          {revoking && <Loader2 size={16} className="animate-spin" />}
          {revoking ? 'Revoking…' : 'Revoke key'}
        </button>
      </div>
    </Dialog>
  );
};

// Checks a key against the validate endpoint. The key stays in this input only.
const KeyTester = () => {
  const [key, setKey] = useState('');
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState({ status: 'idle', result: null, error: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    setState({ status: 'checking', result: null, error: '' });
    try {
      const result = await apiService.validateApiKey(trimmed);
      setState({ status: 'valid', result, error: '' });
    } catch (err) {
      const rejected = err.status === 401 || err.status === 403;
      setState({
        status: rejected ? 'invalid' : 'error',
        result: null,
        error: rejected ? 'This key is not valid. It may be mistyped or revoked.' : `Could not check the key: ${err.message}`,
      });
    }
  };

  return (
    <section aria-labelledby="api-key-tester-title">
      <h3 id="api-key-tester-title" className="m-0 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <ShieldCheck size={15} className="text-slate-500" /> Test a key
      </h3>
      <p className="mb-0 mt-0.5 text-xs text-slate-500">Check that a key works and see what it can access.</p>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="api-key-test-input" className="sr-only">API key</label>
        <div className="relative min-w-0 flex-1">
          <input
            id="api-key-test-input"
            type={visible ? 'text' : 'password'}
            value={key}
            onChange={event => { setKey(event.target.value); if (state.status !== 'checking') setState({ status: 'idle', result: null, error: '' }); }}
            placeholder="Paste an API key"
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-10 font-mono text-sm text-slate-900"
          />
          <button type="button" onClick={() => setVisible(current => !current)} aria-label={visible ? 'Hide key' : 'Show key'} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-700">
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <button type="submit" disabled={!key.trim() || state.status === 'checking'} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          {state.status === 'checking' && <Loader2 size={15} className="animate-spin" />}
          Check key
        </button>
      </form>

      <div aria-live="polite">
        {state.status === 'valid' && state.result && (
          <div className="api-key-test-result is-valid mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-3">
            <p className="m-0 flex items-center gap-2 text-sm font-medium text-emerald-800">
              <Check size={15} /> Valid key: {state.result.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(state.result.permissions || []).map(scope => <ScopeBadge key={scope} scope={scope} />)}
            </div>
            {formatDate(state.result.created_at) && <p className="mb-0 mt-2 text-xs text-slate-500">Created {formatDate(state.result.created_at)}</p>}
          </div>
        )}
        {(state.status === 'invalid' || state.status === 'error') && (
          <p className="api-key-test-result is-invalid mb-0 mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">{state.error}</p>
        )}
      </div>
    </section>
  );
};

const KeyRow = ({ apiKey, copied, onCopy, onRevoke }) => (
  <li className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between ${apiKey.is_active ? '' : 'api-key-row-revoked'}`}>
    <div className="min-w-0">
      <p className={`m-0 flex flex-wrap items-center gap-2 text-sm font-medium ${apiKey.is_active ? 'text-slate-900' : 'text-slate-500'}`}>
        <span className="truncate">{apiKey.name}</span>
        <StatusPill active={apiKey.is_active} />
      </p>
      <p className="mb-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-0.5">
          <code className="font-mono text-[12.5px] text-slate-600">{apiKey.key_prefix}…</code>
          <button
            type="button"
            onClick={() => onCopy(apiKey.key_prefix, apiKey.api_key_id)}
            aria-label={`Copy key prefix for ${apiKey.name}`}
            title="Copy prefix"
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            {copied === apiKey.api_key_id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          </button>
        </span>
        <span>Created {formatDate(apiKey.created_at) || '—'}</span>
        <span>Last used {formatDateTime(apiKey.last_used_at) || 'never'}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {parseScopes(apiKey.permissions).map(scope => <ScopeBadge key={scope} scope={scope} />)}
      </div>
    </div>
    {apiKey.is_active && (
      <button
        type="button"
        onClick={() => onRevoke(apiKey)}
        className="api-key-revoke h-8 shrink-0 self-start rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
      >
        Revoke
      </button>
    )}
  </li>
);

// API keys for the WordPress plugin (and any other script), shown inside the
// WooCommerce connect dialog. Keys belong to the business, not to WooCommerce.
export default function ApiKeysManager() {
  const [keys, setKeys] = useState(/** @type {ApiKeyItem[]} */ ([]));
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [creating, setCreating] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const { copied, copy } = useCopy();

  // State is only set once the request settles, in its callbacks.
  const fetchKeys = useCallback((isCancelled = () => false) => apiService.fetchApiKeys().then(
    (response) => {
      if (isCancelled()) return;
      setKeys(sortKeys(response?.items || []));
      setStatus('ready');
    },
    (err) => {
      if (isCancelled()) return;
      setLoadError(err.message || 'Could not load API keys.');
      setStatus('error');
    },
  ), []);

  const load = () => {
    setStatus(current => (current === 'ready' ? 'refreshing' : 'loading'));
    setLoadError('');
    fetchKeys();
  };

  useEffect(() => {
    let cancelled = false;
    fetchKeys(() => cancelled);
    return () => { cancelled = true; };
  }, [fetchKeys]);

  const handleCreated = useCallback((item) => {
    setKeys(current => sortKeys([item, ...current.filter(key => key.api_key_id !== item.api_key_id)]));
  }, []);

  // Optimistic: the row flips to Revoked at once and flips back if the request fails.
  const handleRevoke = useCallback(async (apiKey) => {
    setKeys(current => sortKeys(current.map(key => (key.api_key_id === apiKey.api_key_id ? { ...key, is_active: false } : key))));
    try {
      await apiService.revokeApiKey(apiKey.api_key_id);
    } catch (err) {
      setKeys(current => sortKeys(current.map(key => (key.api_key_id === apiKey.api_key_id ? { ...key, is_active: apiKey.is_active } : key))));
      throw err;
    }
  }, []);

  const activeCount = keys.filter(key => key.is_active).length;

  return (
    <div className="api-keys-panel space-y-5 text-left">
      <section aria-labelledby="api-keys-list-title">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 id="api-keys-list-title" className="m-0 text-sm font-semibold text-slate-900">
            API keys
            {status === 'ready' && keys.length > 0 && <span className="ml-2 font-normal text-slate-500">{activeCount} active of {keys.length}</span>}
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={load}
              disabled={status === 'loading' || status === 'refreshing'}
              aria-label="Refresh API keys"
              title="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw size={14} className={status === 'refreshing' ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={() => setCreating(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700">
              <Plus size={14} /> Create key
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {status === 'error' ? (
            <div className="px-4 py-6 text-center">
              <p className="m-0 text-sm text-red-600">Could not load API keys: {loadError}</p>
              <button type="button" onClick={load} className="mt-3 h-8 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50">Try again</button>
            </div>
          ) : status === 'loading' ? (
            <div className="space-y-3 p-4" aria-hidden="true">
              {[0, 1].map(index => <div key={index} className="page-sync-shimmer h-12 w-full rounded-lg" />)}
            </div>
          ) : keys.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><KeyRound size={17} /></span>
              <p className="m-0 text-sm font-medium text-slate-900">No API keys yet</p>
              <p className="mb-0 mt-1 text-xs text-slate-500">Create one, then paste it into the plugin's settings.</p>
            </div>
          ) : (
            <ul className="m-0 list-none divide-y divide-slate-100 p-0">
              {keys.map(apiKey => (
                <KeyRow key={apiKey.api_key_id} apiKey={apiKey} copied={copied} onCopy={copy} onRevoke={setRevokeTarget} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <KeyTester />

      {creating && <CreateKeyDialog onClose={() => setCreating(false)} onCreated={handleCreated} />}
      {revokeTarget && <RevokeKeyDialog apiKey={revokeTarget} onClose={() => setRevokeTarget(null)} onRevoke={handleRevoke} />}
    </div>
  );
}
