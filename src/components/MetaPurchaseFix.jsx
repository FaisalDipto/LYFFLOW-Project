import { metaPurchaseFix } from '../utils/metaPurchase';

/**
 * What the owner can do about a purchase Meta didn't get, from its reason. Every reason the
 * owner can act on means a normal reconnect of the page (older ones still say "Connect
 * ads", which is gone). Reconnecting is the owner's; others are told to ask the owner.
 * @param {{ error: string|null, isOwner: boolean, onReconnect?: () => void, className?: string }} props
 */
export default function MetaPurchaseFix({ error, isOwner, onReconnect, className = '' }) {
  if (!metaPurchaseFix(error)) return null;
  if (!isOwner) return <span className={`text-slate-500 ${className}`}>Ask the owner to reconnect the page.</span>;
  return onReconnect
    ? <button type="button" onClick={onReconnect} className={`font-semibold text-emerald-700 hover:text-emerald-900 hover:underline ${className}`}>Reconnect the page</button>
    : null;
}
