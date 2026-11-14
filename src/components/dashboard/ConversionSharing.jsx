import { useState } from 'react';
import { Loader2, RefreshCw, Send } from 'lucide-react';
import { apiService } from '../../services/api';
import { isInstagram } from '../../utils/platforms';

// What a failed switch means, from the endpoint's `detail` (a code or a sentence). Both
// 412s are fixed by a normal reconnect: the connect asks for page_events since 2026-11-12.
const switchError = (error) => {
  const code = error?.code || error?.message || '';
  if (error?.status === 412 && code.includes('ads_connect_required')) return { kind: 'reconnect', text: "This page hasn't allowed Lyfflow to send purchases to Meta yet (it was connected before this could be asked, or the permission was unticked). Reconnect the page and keep that permission." };
  if (error?.status === 412 && code.includes('page_reconnect_required')) return { kind: 'reconnect', text: "The page's connection to Meta has expired. Reconnect the page, then turn this on." };
  if (error?.status === 422) return { kind: null, text: "Instagram accounts can't send purchases to Meta." };
  if (error?.status === 404) return { kind: null, text: 'This page is no longer part of this business.' };
  if (error?.status === 403) return { kind: null, text: 'Only the owner and admins can change this.' };
  if (error?.status === 502 || code.includes('facebook_api_error')) return { kind: null, text: "Meta didn't answer. Try again in a moment." };
  return { kind: null, text: error?.message || "Couldn't change this. Try again." };
};

/**
 * Send purchases to Meta: one switch per Facebook page (owners and admins). With it on,
 * every new order of the page goes to Meta as a purchase 30 minutes after it's created,
 * so Meta can show the page's Send-message ads to people likelier to buy. The permission it
 * needs comes with the normal connect; a page connected before needs one reconnect.
 * @param {{ pages: object[], isOwner: boolean, onPagesChanged?: () => void, onReconnect?: () => void }} props
 */
export default function ConversionSharing({ pages = [], isOwner = false, onPagesChanged, onReconnect }) {
  const [state, setState] = useState({});
  const facebookPages = pages.filter(page => !isInstagram(page.platform));

  const isEnabled = (page) => state[page.page_id]?.enabled ?? Boolean(page.is_conversion_sharing_enabled);
  const onCount = facebookPages.filter(isEnabled).length;
  const allOn = facebookPages.length > 0 && onCount === facebookPages.length;
  const anySaving = facebookPages.some(page => state[page.page_id]?.saving);

  // One page's switch. `refresh` re-reads the pages (the dataset id appears once it's on);
  // "all pages" refreshes once at the end instead.
  const toggle = async (page, next, { refresh = true } = {}) => {
    setState(current => ({ ...current, [page.page_id]: { saving: true, enabled: next, error: null } }));
    try {
      const response = await apiService.setConversionSharing(page.page_id, next);
      setState(current => ({ ...current, [page.page_id]: { saving: false, enabled: response?.is_conversion_sharing_enabled ?? next, error: null } }));
      if (refresh) onPagesChanged?.();
      return true;
    } catch (error) {
      setState(current => ({ ...current, [page.page_id]: { saving: false, enabled: undefined, error: switchError(error) } }));
      return false;
    }
  };

  // Every Facebook page on (or off). Each page is saved on its own, so one that can't
  // (it needs a reconnect, say) shows its own error and the rest still change.
  const toggleAll = async (next) => {
    const changing = facebookPages.filter(page => isEnabled(page) !== next);
    if (changing.length === 0) return;
    const results = await Promise.all(changing.map(page => toggle(page, next, { refresh: false })));
    if (results.some(Boolean)) onPagesChanged?.();
  };

  // Reconnecting is the owner's, as everywhere else.
  const fixButton = (kind) => {
    if (kind !== 'reconnect') return null;
    if (!isOwner) return <span className="text-slate-500">Ask the owner to reconnect the page.</span>;
    return onReconnect
      ? <button type="button" onClick={onReconnect} className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline">Reconnect the page</button>
      : null;
  };

  return (
    <section className="conversion-sharing rounded-2xl border border-solid border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="conversion-sharing-title">
      <header className="mb-3">
        <h2 id="conversion-sharing-title" className="m-0 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          <Send size={15} className="text-slate-500" aria-hidden="true" />
          Send purchases to Meta
        </h2>
        <p className="m-0 mt-0.5 max-w-xl text-[12.5px] leading-relaxed text-slate-500">
          Meta only knows that an ad opened a chat. Telling it which chats ended in an order lets it show your Send-message ads to people likelier to buy.
          Once a page is on, each new order is sent 30 minutes after it's placed; an order cancelled before then isn't.
        </p>
      </header>

      {facebookPages.length === 0 ? (
        <p className="m-0 rounded-xl bg-slate-50 px-3 py-3 text-[13px] text-slate-500">Connect a Facebook page to send its orders to Meta. Instagram accounts can't.</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-slate-100 rounded-xl border border-solid border-slate-200 p-0">
          {facebookPages.length > 1 && (
            <li className="conversion-sharing-all flex items-center gap-3 rounded-t-xl bg-slate-50 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[13px] font-semibold text-slate-900">All Facebook pages</p>
                <p className="m-0 mt-0.5 text-[12px] text-slate-500">
                  {allOn ? 'Every page sends its orders to Meta' : onCount === 0 ? 'No page sends its orders yet' : `${onCount} of ${facebookPages.length} pages send their orders`}
                </p>
              </div>
              {anySaving && <Loader2 size={15} className="animate-spin text-slate-400" aria-hidden="true" />}
              <button
                type="button"
                role="switch"
                aria-checked={allOn ? 'true' : onCount > 0 ? 'mixed' : 'false'}
                aria-label={allOn ? 'Stop sending orders to Meta for every page' : 'Send orders to Meta for every page'}
                title={allOn ? 'Turn off for every page' : 'Turn on for every page'}
                disabled={anySaving}
                onClick={() => toggleAll(!allOn)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${allOn ? 'bg-emerald-500' : onCount > 0 ? 'bg-emerald-300' : 'bg-slate-300'}`}
              >
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${allOn ? 'translate-x-5' : onCount > 0 ? 'translate-x-2.5' : ''}`} />
              </button>
            </li>
          )}
          {facebookPages.map((page) => {
            const local = state[page.page_id] || {};
            const enabled = isEnabled(page);
            return (
              <li key={page.page_id} className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[13.5px] font-semibold text-slate-900">{page.name || page.page_name || page.page_id}</p>
                    <p className="m-0 mt-0.5 text-[12px] text-slate-500">
                      {enabled ? 'Every new order is sent to Meta' : 'Off: orders stay in Lyfflow'}
                      {page.meta_dataset_id && (
                        <span className="ml-1.5 font-mono text-[11px] text-slate-400" title="Find the same purchases under this dataset in Meta Events Manager">
                          · Dataset {page.meta_dataset_id}
                        </span>
                      )}
                    </p>
                  </div>
                  {local.saving && <Loader2 size={15} className="animate-spin text-slate-400" aria-hidden="true" />}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Send ${page.name || 'this page'}'s orders to Meta`}
                    disabled={local.saving}
                    onClick={() => toggle(page, !enabled)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                {local.error && (
                  <p className="m-0 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-amber-50 px-2.5 py-2 text-[12px] text-amber-800" role="alert">
                    <span>{local.error.text}</span>
                    {fixButton(local.error.kind)}
                    {!local.error.kind && (
                      <button type="button" onClick={() => toggle(page, !enabled)} className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:underline">
                        <RefreshCw size={12} aria-hidden="true" /> Try again
                      </button>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ul className="m-0 mt-3 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-slate-500">
        <li>Every order of the page is sent, not only orders from an ad. Meta matches each one to its own ads.</li>
        <li>Meta gets the order's value and currency and the customer's Messenger id for this page. No name, phone or address.</li>
        <li>It changes who sees an ad only when the ad set's performance goal in Ads Manager is set to purchases.</li>
        <li>A page connected before 12 November 2026 needs one reconnect before it can send purchases or show its ad spend.</li>
      </ul>
    </section>
  );
}
