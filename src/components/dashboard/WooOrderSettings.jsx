import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api';
import { WOO_PUSH_STATUSES } from '../../utils/woocommerce';

const settingsError = (error) => {
  if (error?.status === 403) return 'Only the owner and admins can change order sync.';
  if (error?.status === 404) return 'Connect a store to set up order sync.';
  return error?.message || 'Could not save the order sync settings.';
};

/**
 * Store settings (GET/PATCH /v1/woocommerce/settings): whether new orders are pushed to
 * WooCommerce after their 30-minute hold, and the status they are created with. Each
 * change saves straight away and rolls back if the save fails.
 * @param {{ canEdit: boolean }} props  owner or admin
 */
export default function WooOrderSettings({ canEdit }) {
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(null); // field being saved
  const [message, setMessage] = useState(null); // { tone, text }

  useEffect(() => {
    let cancelled = false;
    apiService.getWooSettings()
      .then(data => { if (!cancelled) setSettings(data); })
      .catch(error => { if (!cancelled) setLoadError(settingsError(error)); });
    return () => { cancelled = true; };
  }, []);

  const save = async (field, value) => {
    const previous = settings;
    setSettings(current => ({ ...current, [field]: value }));
    setSaving(field);
    setMessage(null);
    try {
      const updated = await apiService.updateWooSettings({ [field]: value });
      setSettings(updated || { ...previous, [field]: value });
      setMessage({ tone: 'success', text: 'Saved.' });
    } catch (error) {
      setSettings(previous);
      setMessage({ tone: 'error', text: settingsError(error) });
    } finally {
      setSaving(null);
    }
  };

  if (loadError) {
    return <p className="m-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">{loadError}</p>;
  }
  if (!settings) {
    return <div className="h-[132px] animate-pulse rounded-xl bg-slate-100" aria-label="Loading order sync settings" />;
  }

  const enabled = Boolean(settings.order_sync_enabled);
  return (
    <section aria-labelledby="woo-order-sync-title" className="woo-order-settings rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 id="woo-order-sync-title" className="m-0 text-sm font-semibold text-slate-900">Send new orders to WooCommerce</h3>
          <p className="mb-0 mt-1 text-xs leading-5 text-slate-500">
            New orders wait 30 minutes, so the customer can still change them, then go to your store. While this is off they stay in Lyfflow; turning it back on doesn't send them.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="woo-order-sync-title"
          onClick={() => save('order_sync_enabled', !enabled)}
          disabled={!canEdit || saving !== null}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor="woo-order-push-status" className="mb-1.5 block text-xs font-semibold text-slate-700">Status in WooCommerce</label>
        <div className="flex items-center gap-2">
          <select
            id="woo-order-push-status"
            value={settings.order_push_status || 'pending'}
            onChange={event => save('order_push_status', event.target.value)}
            disabled={!canEdit || saving !== null}
            aria-describedby={settings.order_push_status === 'completed' ? 'woo-completed-warning' : undefined}
            className="h-9 w-full max-w-[240px] rounded-lg border border-solid border-slate-200 bg-white px-3 text-sm text-slate-800 disabled:opacity-60"
          >
            {WOO_PUSH_STATUSES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {saving && <Loader2 size={15} className="animate-spin text-slate-400" aria-label="Saving" />}
        </div>
        <p className="mb-0 mt-1.5 text-[11px] text-slate-500">The status orders are created with, whether they're sent automatically or with Push now.</p>
        {settings.order_push_status === 'completed' && (
          <p id="woo-completed-warning" className="mb-0 mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            Completed sends the customer WooCommerce's "order complete" email and may reduce stock immediately.
          </p>
        )}
      </div>

      {!canEdit && <p className="mb-0 mt-3 text-[11px] text-slate-500">Only the owner and admins can change these settings.</p>}
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mb-0 mt-3 text-xs font-semibold ${message.tone === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{message.text}</p>
      )}
    </section>
  );
}
