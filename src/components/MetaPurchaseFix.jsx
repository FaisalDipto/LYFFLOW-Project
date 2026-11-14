import { ADS_CONNECT_AVAILABLE, connectAds, metaPurchaseFix } from '../utils/metaPurchase';

/**
 * What the owner can do about a purchase Meta didn't get, from its reason: "Connect ads"
 * (owner only, where the Meta app has page_events) or the normal reconnect (owner only,
 * like every reconnect). Others are told to ask the owner. Nothing for other reasons.
 * @param {{ error: string|null, isOwner: boolean, pages?: object[], onReconnect?: () => void, className?: string }} props
 */
export default function MetaPurchaseFix({ error, isOwner, pages = [], onReconnect, className = '' }) {
  const fix = metaPurchaseFix(error);
  if (!fix) return null;
  const button = `font-semibold text-emerald-700 hover:text-emerald-900 hover:underline ${className}`;
  const note = `text-slate-500 ${className}`;
  if (fix === 'connect_ads') {
    if (!isOwner) return <span className={note}>Ask the owner to use "Connect ads".</span>;
    return ADS_CONNECT_AVAILABLE
      ? <button type="button" onClick={() => connectAds(pages)} className={button}>Connect ads</button>
      : <span className={note}>"Connect ads" isn't available on this app yet.</span>;
  }
  if (!isOwner) return <span className={note}>Ask the owner to reconnect the page.</span>;
  return onReconnect ? <button type="button" onClick={onReconnect} className={button}>Reconnect the page</button> : null;
}
