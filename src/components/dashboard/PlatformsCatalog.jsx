import { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Bike, CheckCircle2, Clock, Link2, PackageCheck, RefreshCw, Search, ShoppingBag, Store, X } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { apiService } from '../../services/api';
import ApiKeysManager from './ApiKeysManager';
import { wooConnectionState } from '../../utils/woocommerce';

const BrandPath = ({ d }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true"><path d={d} /></svg>
);

const FACEBOOK_PATH = 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z';
const INSTAGRAM_PATH = 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z';
const WHATSAPP_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';

const PlatformLogo = ({ platform }) => (
  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: platform.brand }}>
    {platform.logo}
  </span>
);

const formatWhen = (value) => {
  if (!value) return null;
  const text = String(value);
  // Naive timestamps from the API are UTC.
  const date = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(text) || !text.includes('T') ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const STATE_STYLES = {
  connected: { label: 'Connected', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle2, iconClass: 'text-emerald-600' },
  pending: { label: 'Waiting for the plugin', badge: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500', icon: Clock, iconClass: 'text-amber-600' },
  error: { label: 'Connection issue', badge: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500', icon: AlertTriangle, iconClass: 'text-red-600' },
  none: { label: 'Not connected', badge: 'border-slate-200 bg-slate-50 text-slate-600', dot: 'bg-slate-400', icon: Store, iconClass: 'text-slate-400' },
};

// Where the store stands, from GET /v1/woocommerce/status, with a manual re-check:
// the plugin connects from WordPress, so the status can change while this is open.
const WooStatusPanel = ({ status, state, checking, onRefresh, isOwner, onDisconnect }) => {
  const style = STATE_STYLES[state];
  const Icon = style.icon;
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const details = [
    ['Store', status?.store_url],
    ['Plugin', status?.plugin_version && `v${status.plugin_version}`],
    ['WooCommerce', status?.wc_version && `v${status.wc_version}`],
    ['WordPress', status?.wp_version && `v${status.wp_version}`],
    ['Connected', formatWhen(status?.plugin_connected_at || status?.connected_at)],
    ['Last sync', formatWhen(status?.last_synced_at)],
  ].filter(([, value]) => value);

  const disconnect = async () => {
    setDisconnecting(true);
    setError('');
    try {
      await onDisconnect();
      setConfirming(false);
    } catch (err) {
      setError(err.message || 'Could not disconnect the store.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <section aria-labelledby="woo-status-title" className="woo-status-panel rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon size={20} className={`mt-0.5 shrink-0 ${style.iconClass}`} aria-hidden="true" />
          <div className="min-w-0">
            <h3 id="woo-status-title" className="m-0 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
              Store status
              <span className={`woo-state-badge is-${state} inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${style.badge}`}>
                <span className={`h-1.5 w-1.5 ${style.dot}`} style={{ borderRadius: 9999 }} aria-hidden="true" />
                {style.label}
              </span>
            </h3>
            <p className="mb-0 mt-1 text-xs leading-5 text-slate-500">
              {state === 'connected' && 'Products sync from your store, and new orders are pushed to it automatically.'}
              {state === 'pending' && 'A store is on record, but the plugin hasn\'t connected yet. Paste your API key into the plugin and click Connect there.'}
              {state === 'error' && 'The store connection is failing, so products and orders aren\'t syncing.'}
              {state === 'none' && 'Follow the two steps below. The plugin detects your store\'s address on its own.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={checking}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={13} className={checking ? 'animate-spin' : ''} /> Check again
        </button>
      </div>

      {state === 'error' && status?.last_sync_error && (
        <p className="mb-0 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          {status.last_sync_error}
          <span className="mt-1 block text-red-600/80">If the key was revoked or replaced, create a new one below and paste it into the plugin.</span>
        </p>
      )}

      {details.length > 0 && (
        <dl className="mb-0 mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="flex min-w-0 gap-2">
              <dt className="shrink-0 text-slate-500">{label}</dt>
              <dd className="m-0 min-w-0 truncate font-medium text-slate-800" title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {isOwner && state !== 'none' && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-600">Disconnect the store? Products and orders stop syncing until the plugin connects again.</span>
              <button type="button" onClick={() => setConfirming(false)} disabled={disconnecting} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={disconnect} disabled={disconnecting} className="h-8 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {disconnecting ? 'Disconnecting…' : 'Disconnect store'}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="rounded-md text-xs font-medium text-red-600 hover:underline">Disconnect store</button>
          )}
          {error && <p role="alert" className="mb-0 mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
};

// WooCommerce connects through the Lyfflow WordPress plugin only: create an API key
// here, paste it into the plugin, and the plugin connects the store (it detects the
// store URL itself).
const WooCommerceModal = ({ isOwner, status, onStatusChange, onClose }) => {
  const [checking, setChecking] = useState(false);
  const state = wooConnectionState(status);

  useEffect(() => {
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const refresh = async () => {
    setChecking(true);
    try {
      onStatusChange(await apiService.getWooCommerceStatus({ fresh: true }));
    } catch {
      // Keep showing the last known status.
    } finally {
      setChecking(false);
    }
  };

  const disconnect = async () => {
    await apiService.disconnectWooCommerce();
    onStatusChange(await apiService.getWooCommerceStatus({ fresh: true }).catch(() => ({ status: 'not_connected', plugin_connected: false })));
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      {/* Stops clicks here, including ones bubbling up from the key dialogs rendered
          inside, so the one-time key reveal can't close this dialog underneath it. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="woo-connect-title"
        onClick={event => event.stopPropagation()}
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl animate-scale-in"
      >
        <div className="border-b border-slate-100 px-6 pb-4 pt-6">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X size={16} />
          </button>
          <h2 id="woo-connect-title" className="m-0 text-lg font-black text-slate-900">{state === 'none' ? 'Connect WooCommerce' : 'WooCommerce'}</h2>
          <p className="mb-0 mt-1 text-sm text-slate-500">Sync your store's products into Lyfflow and send orders back to it, through the Lyfflow WordPress plugin.</p>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <WooStatusPanel status={status} state={state} checking={checking} onRefresh={refresh} isOwner={isOwner} onDisconnect={disconnect} />

          <ol className="m-0 list-none space-y-3 p-0">
            <li className="flex gap-3">
              <span className="woo-step flex h-6 w-6 shrink-0 items-center justify-center bg-violet-600 text-xs font-bold text-white" style={{ borderRadius: 9999 }}>1</span>
              <p className="m-0 text-sm text-slate-700"><span className="font-semibold text-slate-900">Create an API key</span> below and copy it. You'll only see the full key once.</p>
            </li>
            <li className="flex gap-3">
              <span className="woo-step flex h-6 w-6 shrink-0 items-center justify-center bg-violet-600 text-xs font-bold text-white" style={{ borderRadius: 9999 }}>2</span>
              <p className="m-0 text-sm text-slate-700"><span className="font-semibold text-slate-900">In WordPress,</span> open the Lyfflow plugin's settings, paste the key and click Connect. Then use Check again above.</p>
            </li>
          </ol>

          <ApiKeysManager />
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default function PlatformsCatalog({ pages, onConnectFacebook, onNavigate }) {
  const { isOwner, canManage } = useBusiness();
  const [query, setQuery] = useState('');
  // GET /v1/woocommerce/status, or null until it loads (or if it fails).
  const [wooStatus, setWooStatus] = useState(null);
  const wooState = wooConnectionState(wooStatus);
  const wooConnected = wooState === 'connected';
  const [isWooModalOpen, setIsWooModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiService.getWooCommerceStatus()
      .then(status => { if (!cancelled) setWooStatus(status); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const hasFacebookPages = Array.isArray(pages) && pages.length > 0;

  // `action` is null for integrations the backend doesn't support yet.
  const platforms = useMemo(() => [
    {
      id: 'facebook', title: 'Facebook Messenger', brand: '#1877F2',
      logo: <BrandPath d={FACEBOOK_PATH} />,
      description: 'Let your AI agent answer Messenger conversations, capture leads and take orders on your Facebook pages.',
      connected: hasFacebookPages,
      action: hasFacebookPages ? () => onNavigate('channels') : (isOwner ? onConnectFacebook : null),
      actionLabel: hasFacebookPages ? 'Manage pages' : 'Connect',
      ownerOnly: !hasFacebookPages,
    },
    {
      id: 'instagram', title: 'Instagram Direct', brand: 'linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af)',
      logo: <BrandPath d={INSTAGRAM_PATH} />,
      description: 'Reply to Instagram DMs and story mentions with the same agents and knowledge you use on Messenger.',
      comingSoon: true,
    },
    {
      id: 'whatsapp', title: 'WhatsApp Business', brand: '#25D366',
      logo: <BrandPath d={WHATSAPP_PATH} />,
      description: 'Connect a WhatsApp Business account so customers can chat, ask about products and order over WhatsApp.',
      comingSoon: true,
    },
    {
      id: 'woocommerce', title: 'WooCommerce', brand: '#7f54b3',
      logo: <Store size={24} strokeWidth={2.2} />,
      description: 'Import your WooCommerce catalog so agents can quote live prices, stock and product details.',
      connected: wooConnected,
      issue: wooState === 'error' ? 'Needs attention' : wooState === 'pending' ? 'Finish setup' : null,
      // Admin+: creating the plugin's API key is admin+; disconnecting is owner-only inside.
      action: canManage ? () => setIsWooModalOpen(true) : null,
      actionLabel: wooState === 'none' ? 'Connect' : 'Manage',
      adminOnly: true,
    },
    {
      id: 'shopify', title: 'Shopify', brand: '#5e8e3e',
      logo: <ShoppingBag size={24} strokeWidth={2.2} />,
      description: 'Sync Shopify products and orders so your agent always sells from an up-to-date catalog.',
      comingSoon: true,
    },
    {
      id: 'pathao', title: 'Pathao Courier', brand: '#e8202a',
      logo: <Bike size={24} strokeWidth={2.2} />,
      description: 'Book Pathao deliveries straight from captured orders, with price estimates and consignment tracking.',
      action: () => onNavigate('courier-pathao'),
      actionLabel: 'Connect',
    },
    {
      id: 'steadfast', title: 'Steadfast Courier', brand: '#00a651',
      logo: <PackageCheck size={24} strokeWidth={2.2} />,
      description: 'Send orders to Steadfast in one click and get delivery status updates back automatically.',
      action: () => onNavigate('courier-steadfast'),
      actionLabel: 'Connect',
    },
  ], [hasFacebookPages, isOwner, canManage, onConnectFacebook, onNavigate, wooConnected, wooState]);

  const normalizedQuery = query.trim().toLowerCase();
  const visible = platforms.filter(platform => (
    !normalizedQuery || `${platform.title} ${platform.description}`.toLowerCase().includes(normalizedQuery)
  ));

  return (
    <div className="dashboard-compact-top dashboard-content-area w-full flex-1 bg-surface-bright text-left">
      {/* The top bar already names the page; this heading is kept for screen readers only. */}
      <h1 className="sr-only">Platforms</h1>
      <div className="mb-4 flex sm:justify-end">
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Search integrations</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search integrations"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 p-6 text-center">
          <span className="text-sm font-black text-slate-700">No integrations match your search</span>
          <span className="text-xs font-medium text-slate-500">Try a different name.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(platform => {
            const blockedForRole = platform.adminOnly ? !canManage : platform.ownerOnly && !isOwner && !platform.connected;
            const handleClick = platform.comingSoon ? null : platform.action;
            return (
              <article key={platform.id} className="flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <PlatformLogo platform={platform} />
                  {platform.connected && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                  )}
                  {platform.issue && (
                    <span className="platform-issue-badge inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {platform.issue}
                    </span>
                  )}
                  {platform.comingSoon && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Coming soon</span>
                  )}
                </div>
                <h2 className="mb-0 mt-4 text-base font-black text-slate-900">{platform.title}</h2>
                <p className="mb-5 mt-1.5 text-sm leading-6 text-slate-500">{platform.description}</p>
                <button
                  type="button"
                  onClick={handleClick || undefined}
                  disabled={!handleClick || blockedForRole}
                  title={blockedForRole ? `Only the business ${platform.adminOnly ? 'owner or an admin' : 'owner'} can connect this platform` : platform.comingSoon ? 'Not available yet' : undefined}
                  className="mt-auto inline-flex h-10 items-center gap-2 self-start rounded-lg bg-violet-600 px-4 text-sm font-bold text-white shadow-sm shadow-violet-600/20 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Link2 size={16} />
                  {platform.actionLabel || 'Connect'}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {isWooModalOpen && (
        <WooCommerceModal
          isOwner={isOwner}
          status={wooStatus}
          onStatusChange={setWooStatus}
          onClose={() => setIsWooModalOpen(false)}
        />
      )}
    </div>
  );
}
