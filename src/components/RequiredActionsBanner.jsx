import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { apiService } from '../services/api';

/**
 * Unresolved GET /v1/user-required-actions items for the active business.
 * `can_action` is decided server-side (owner only); everyone else gets a
 * read-only banner telling them the owner has to act.
 */
const RequiredActionsBanner = ({ onReconnectFacebook, onOpenSubscription }) => {
  const [actions, setActions] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await apiService.getRequiredActions();
      setActions(Array.isArray(data?.actions) ? data.actions : []);
    } catch {
      // Banners are advisory; the dashboard works without them.
      setActions([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (actionId) => {
    setResolvingId(actionId);
    try {
      await apiService.resolveRequiredAction(actionId);
      setActions(current => current.filter(action => action.id !== actionId));
    } catch {
      // Leave the banner in place; it will be fetched again on next load.
    } finally {
      setResolvingId(null);
    }
  };

  if (actions.length === 0) return null;

  const ctaFor = (action) => {
    if (action.action_type === 'facebook_reauth' || action.action_type === 'instagram_reauth') {
      return { label: 'Reconnect', onClick: onReconnectFacebook };
    }
    if (action.action_type === 'subscription_due') {
      return { label: 'Review billing', onClick: onOpenSubscription };
    }
    return null;
  };

  return (
    <div className="required-actions mx-4 mt-4 space-y-2 md:mx-6 xl:mx-8">
      {actions.map(action => {
        const cta = action.can_action ? ctaFor(action) : null;
        return (
          <div key={action.id} role="alert" className="required-action flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="m-0 text-sm font-black text-amber-900">{action.title}</p>
                {action.description && <p className="mb-0 mt-0.5 text-xs font-semibold leading-5 text-amber-800">{action.description}</p>}
                {!action.can_action && (
                  <p className="mb-0 mt-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">Action required by the business owner</p>
                )}
              </div>
            </div>
            {action.can_action && (
              <div className="flex shrink-0 items-center gap-2">
                {cta && (
                  <button type="button" onClick={cta.onClick} className="h-8 rounded-lg bg-amber-600 px-3.5 text-xs font-black text-white transition-colors hover:bg-amber-700">
                    {cta.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => resolve(action.id)}
                  disabled={resolvingId === action.id}
                  aria-label="Mark as resolved"
                  title="Mark as resolved"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RequiredActionsBanner;
