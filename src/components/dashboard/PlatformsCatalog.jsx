import { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Bike, CheckCircle2, Clock, Download, Link2, Loader2, PackageCheck, RefreshCw, Search, Send, Settings2, ShoppingBag, ShoppingCart, Store, Truck, X } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { apiService } from '../../services/api';
import ApiKeysManager from './ApiKeysManager';
import { wooConnectionState } from '../../utils/woocommerce';
import { saveBlob } from '../../utils/download';

const BrandPath = ({ d }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true"><path d={d} /></svg>
);

const FACEBOOK_PATH = 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z';
const INSTAGRAM_PATH = 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z';
const WHATSAPP_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';

const TIKTOK_PATH = 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';

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
const WooStatusPanel = ({ status, state, checking, onRefresh, isOwner, onDisconnect, catalogName }) => {
  const style = STATE_STYLES[state];
  const Icon = style.icon;
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const details = [
    ['Store', status?.store_url],
    ['Catalog', catalogName],
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
              {state === 'pending' && 'A store is on record, but the plugin hasn\'t connected yet. Paste your API key into the plugin, choose a catalog and click Connect there.'}
              {state === 'error' && 'The store connection is failing, so products and orders aren\'t syncing.'}
              {state === 'none' && 'Follow the three steps below. The plugin detects your store\'s address on its own.'}
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

const WooStep = ({ n, children }) => (
  <li className="flex gap-3">
    <span className="woo-step flex h-6 w-6 shrink-0 items-center justify-center bg-violet-600 text-xs font-bold text-white" style={{ borderRadius: 9999 }}>{n}</span>
    <div className="min-w-0 flex-1 text-sm text-slate-700">{children}</div>
  </li>
);

// Downloads the plugin zip. The route needs the session, so this fetches it and saves
// the blob instead of linking to it.
const DownloadPluginButton = () => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      const { blob, filename } = await apiService.downloadWooPlugin();
      saveBlob(blob, filename);
    } catch (err) {
      setError(err.message || 'Could not download the plugin. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        className="woo-download-plugin inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-wait disabled:opacity-70"
      >
        {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {downloading ? 'Downloading…' : 'Download plugin'}
      </button>
      {error && <p role="alert" className="mb-0 mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
};

// WooCommerce connects through the Lyfflow WordPress plugin only: create an API key
// here and paste it into the plugin, which lists the key's catalogs (namespaces), lets
// the merchant pick one and connects the store (it detects the store URL itself).
const WooCommerceModal = ({ isOwner, status, onStatusChange, onClose }) => {
  const [checking, setChecking] = useState(false);
  const state = wooConnectionState(status);
  // Names the catalog the plugin syncs into; falls back to the raw id if it isn't listed.
  const [namespaces, setNamespaces] = useState([]);
  const namespaceId = status?.namespace_id;
  const catalogName = namespaceId ? (namespaces.find(item => item.namespace_id === namespaceId)?.namespace_name || namespaceId) : null;

  useEffect(() => {
    if (!namespaceId) return undefined;
    let cancelled = false;
    apiService.getNamespaces()
      .then(data => { if (!cancelled) setNamespaces(Array.isArray(data?.namespaces) ? data.namespaces : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [namespaceId]);

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
          <WooStatusPanel status={status} state={state} checking={checking} onRefresh={refresh} isOwner={isOwner} onDisconnect={disconnect} catalogName={catalogName} />

          <ol className="m-0 list-none space-y-3 p-0">
            <WooStep n={1}>
              <p className="m-0"><span className="font-semibold text-slate-900">Install the Lyfflow plugin.</span> Download it, then in WordPress go to Plugins → Add New → Upload Plugin, choose the zip and activate it.</p>
              <DownloadPluginButton />
            </WooStep>
            <WooStep n={2}>
              <p className="m-0"><span className="font-semibold text-slate-900">Create an API key</span> below and copy it. You'll only see the full key once.</p>
            </WooStep>
            <WooStep n={3}>
              <p className="m-0"><span className="font-semibold text-slate-900">In WordPress,</span> open the Lyfflow plugin's settings and paste the key. Choose the catalog to sync products into, click Connect, then use Check again above.</p>
            </WooStep>
          </ol>

          <ApiKeysManager />
        </div>
      </div>
    </div>,
    document.body,
  );
};

// Platforms by section, with the display names the backend uses. Ids match the keys
// of GET /v1/business/platforms.
const PLATFORM_GROUPS = [
  { id: 'social', title: 'Social & messaging', ids: ['facebook', 'instagram', 'whatsapp', 'tiktok'] },
  { id: 'courier', title: 'Courier', ids: ['steadfast', 'pathao', 'redx', 'paperfly'] },
  { id: 'ecommerce', title: 'E-commerce', ids: ['woocommerce', 'shopify', 'daraz'] },
];

// Used only when the status endpoint can't be reached: what the backend supports today.
const AVAILABLE_FALLBACK = new Set(['facebook', 'instagram', 'steadfast', 'pathao', 'woocommerce']);

const PLATFORM_INFO = {
  facebook: {
    title: 'Facebook Pages & Messenger', brand: '#1877F2', logo: <BrandPath d={FACEBOOK_PATH} />,
    description: 'Let your AI agent answer Messenger conversations, capture leads and take orders on your Facebook pages.',
  },
  instagram: {
    title: 'Instagram Professional', brand: 'linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af)', logo: <BrandPath d={INSTAGRAM_PATH} />,
    description: 'Reply to Instagram DMs with the same agents and knowledge you use on Messenger.',
  },
  whatsapp: {
    title: 'WhatsApp Cloud API', brand: '#25D366', logo: <BrandPath d={WHATSAPP_PATH} />,
    description: 'Let customers chat, ask about products and order over WhatsApp Business.',
  },
  tiktok: {
    // A faint inner ring keeps the black tile visible on dark cards.
    title: 'TikTok Shop / Messaging', brand: '#111111', ring: true, logo: <BrandPath d={TIKTOK_PATH} />,
    description: 'Answer TikTok messages and shop questions with your agents.',
  },
  steadfast: {
    title: 'Steadfast Courier', brand: '#00a651', logo: <PackageCheck size={24} strokeWidth={2.2} />,
    description: 'Send orders to Steadfast in one click and get delivery status updates back automatically.',
  },
  pathao: {
    title: 'Pathao Courier', brand: '#e8202a', logo: <Bike size={24} strokeWidth={2.2} />,
    description: 'Book Pathao deliveries straight from captured orders, with price estimates and consignment tracking.',
  },
  redx: {
    title: 'RedX Courier', brand: '#d7182a', logo: <Truck size={24} strokeWidth={2.2} />,
    description: 'Hand orders to RedX for delivery and follow their status from Lyfflow.',
  },
  paperfly: {
    title: 'Paperfly', brand: '#0072bc', logo: <Send size={22} strokeWidth={2.2} />,
    description: 'Ship orders with Paperfly and track deliveries from captured orders.',
  },
  woocommerce: {
    title: 'WooCommerce', brand: '#7f54b3', logo: <Store size={24} strokeWidth={2.2} />,
    description: 'Import your WooCommerce catalog so agents can quote live prices, stock and product details.',
  },
  shopify: {
    title: 'Shopify Store', brand: '#5e8e3e', logo: <ShoppingBag size={24} strokeWidth={2.2} />,
    description: 'Sync Shopify products and orders so your agent always sells from an up-to-date catalog.',
  },
  daraz: {
    title: 'Daraz Marketplace', brand: '#f85606', logo: <ShoppingCart size={24} strokeWidth={2.2} />,
    description: 'Bring your Daraz listings and orders into Lyfflow.',
  },
};

const INSTAGRAM_DM_NOTE = 'To receive DMs in Lyfflow, turn on "Allow access to messages" in the Instagram app: Settings and privacy → Messages and story replies → Message controls.';

const BADGES = {
  soon: { label: 'Coming soon', className: 'border-slate-200 bg-slate-50 text-slate-500', dot: 'bg-slate-400' },
  connected: { label: 'Connected', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  disconnected: { label: 'Not connected', className: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
};

// `isActive`: the Platforms tab is showing; its status is re-read each time it opens,
// since connections usually change elsewhere (Facebook, courier pages, the plugin).
export default function PlatformsCatalog({ pages, onConnectFacebook, onNavigate, isActive = true }) {
  const { isOwner, canManage } = useBusiness();
  const [query, setQuery] = useState('');
  // GET /v1/woocommerce/status, or null until it loads (or if it fails).
  const [wooStatus, setWooStatus] = useState(null);
  const wooState = wooConnectionState(wooStatus);
  const [isWooModalOpen, setIsWooModalOpen] = useState(false);
  // GET /v1/business/platforms: { loaded, data } (data stays null if it failed).
  const [platformStatus, setPlatformStatus] = useState({ loaded: false, data: null });
  const [statusVersion, setStatusVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiService.getWooCommerceStatus()
      .then(status => { if (!cancelled) setWooStatus(status); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isActive) return undefined;
    let cancelled = false;
    apiService.getBusinessPlatforms({ fresh: statusVersion > 0 })
      .then(data => { if (!cancelled) setPlatformStatus({ loaded: true, data }); })
      .catch(error => {
        console.error('Failed to load platform status:', error);
        if (!cancelled) setPlatformStatus(prev => ({ loaded: true, data: prev.data }));
      });
    return () => { cancelled = true; };
  }, [isActive, statusVersion]);

  const refreshStatus = () => setStatusVersion(version => version + 1);
  const hasFacebookPages = Array.isArray(pages) && pages.length > 0;

  const cards = useMemo(() => {
    const statusOf = (group, id) => platformStatus.data?.[group]?.[id];
    // What each supported platform does from here; anything missing shows as coming soon.
    const actions = {
      facebook: (connected) => (connected
        ? { label: 'Manage pages', run: () => onNavigate('channels') }
        : { label: 'Connect', run: isOwner ? () => onConnectFacebook({ includeInstagram: false }) : null, blockedFor: 'owner' }),
      instagram: (connected) => (connected
        ? { label: 'Manage', run: () => onNavigate('channels') }
        : { label: 'Connect', run: isOwner ? () => onConnectFacebook({ includeInstagram: true }) : null, blockedFor: 'owner' }),
      steadfast: (connected) => ({ label: connected ? 'Manage' : 'Connect', run: () => onNavigate('courier-steadfast') }),
      pathao: (connected) => ({ label: connected ? 'Manage' : 'Connect', run: () => onNavigate('courier-pathao') }),
      // Admin+: creating the plugin's API key is admin+; disconnecting is owner-only inside.
      woocommerce: () => ({
        label: wooState === 'none' ? 'Connect' : 'Manage',
        run: canManage ? () => setIsWooModalOpen(true) : null,
        blockedFor: 'admin',
      }),
    };
    // Before (or without) the status endpoint, fall back to what the app already knows.
    const fallbackConnected = { facebook: hasFacebookPages, woocommerce: wooState === 'connected' };

    return PLATFORM_GROUPS.map(group => ({
      ...group,
      items: group.ids.map(id => {
        const status = statusOf(group.id, id);
        const isAvailable = status ? status.is_available : AVAILABLE_FALLBACK.has(id);
        const connected = id === 'woocommerce' && wooState !== 'none'
          ? wooState === 'connected'
          : (status ? status.connected : Boolean(fallbackConnected[id]));
        const action = isAvailable && actions[id] ? actions[id](connected) : null;
        let badge = !action ? BADGES.soon : connected ? BADGES.connected : BADGES.disconnected;
        // WooCommerce has states between "not connected" and "connected".
        if (action && id === 'woocommerce' && wooState === 'pending') badge = { ...BADGES.disconnected, label: 'Finish setup' };
        if (action && id === 'woocommerce' && wooState === 'error') badge = { label: 'Needs attention', className: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' };
        // Badges wait for the status call so cards don't flash "Not connected" first.
        return { id, ...PLATFORM_INFO[id], connected, action, badge, showBadge: platformStatus.loaded };
      }),
    }));
  }, [platformStatus, hasFacebookPages, wooState, isOwner, canManage, onConnectFacebook, onNavigate]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = cards
    .map(group => ({
      ...group,
      items: group.items.filter(item => !normalizedQuery
        || `${item.title} ${item.description} ${group.title}`.toLowerCase().includes(normalizedQuery)),
    }))
    .filter(group => group.items.length > 0);

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

      {visibleGroups.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 p-6 text-center">
          <span className="text-sm font-black text-slate-700">No integrations match your search</span>
          <span className="text-xs font-medium text-slate-500">Try a different name.</span>
        </div>
      ) : (
        <div className="space-y-8">
          {visibleGroups.map(group => (
            <section key={group.id} aria-labelledby={`platforms-${group.id}`}>
              <h2 id={`platforms-${group.id}`} className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{group.title}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map(platform => {
                  const { action } = platform;
                  const blocked = action && !action.run;
                  const blockedTitle = action?.blockedFor === 'admin'
                    ? 'Only the business owner or an admin can connect this platform'
                    : 'Only the business owner can connect this platform';
                  return (
                    <article
                      key={platform.id}
                      className={`flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 ${action ? 'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md' : 'platform-card-soon'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${action ? '' : 'opacity-60 grayscale-[35%]'}`} style={{ background: platform.brand, boxShadow: platform.ring ? 'inset 0 0 0 1px rgba(255,255,255,.22)' : undefined }}>
                          {platform.logo}
                        </span>
                        {platform.showBadge && (
                          <span className={`platform-status-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${platform.badge.className}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${platform.badge.dot}`} />
                            {platform.badge.label}
                          </span>
                        )}
                      </div>
                      <h3 className="mb-0 mt-4 text-base font-black text-slate-900">{platform.title}</h3>
                      <p className="mb-5 mt-1.5 text-sm leading-6 text-slate-500">{platform.description}</p>
                      {platform.id === 'instagram' && platform.connected && (
                        <p className="-mt-2 mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">{INSTAGRAM_DM_NOTE}</p>
                      )}
                      {!action ? (
                        <button
                          type="button"
                          disabled
                          title="Integration in active development"
                          className="mt-auto inline-flex h-10 items-center gap-2 self-start rounded-lg border border-solid border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-400 disabled:cursor-not-allowed"
                        >
                          <Clock size={16} /> Coming soon
                        </button>
                      ) : platform.connected ? (
                        <button
                          type="button"
                          onClick={action.run || undefined}
                          disabled={blocked}
                          title={blocked ? blockedTitle : undefined}
                          className="mt-auto inline-flex h-10 items-center gap-2 self-start rounded-lg border border-solid border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Settings2 size={16} /> {action.label}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={action.run || undefined}
                          disabled={blocked}
                          title={blocked ? blockedTitle : undefined}
                          className="mt-auto inline-flex h-10 items-center gap-2 self-start rounded-lg bg-violet-600 px-4 text-sm font-bold text-white shadow-sm shadow-violet-600/20 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Link2 size={16} /> {action.label}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {isWooModalOpen && (
        <WooCommerceModal
          isOwner={isOwner}
          status={wooStatus}
          onStatusChange={(status) => { setWooStatus(status); refreshStatus(); }}
          onClose={() => setIsWooModalOpen(false)}
        />
      )}
    </div>
  );
}
