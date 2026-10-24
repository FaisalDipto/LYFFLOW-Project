import { useState } from 'react';
import { LayoutGrid, Package } from 'lucide-react';
import { API_BASE } from '../../config/env';

// Card images load like attachments. Keys expire after an hour (403) and a missing
// image is normal, so a failed load falls back to the placeholder.
const CardImage = ({ imageKey, inverted }) => {
  const [failedKey, setFailedKey] = useState(null);
  const placeholder = (
    <div className={`flex h-full w-full items-center justify-center ${inverted ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-400'}`}>
      <Package size={22} aria-hidden="true" />
    </div>
  );
  if (!imageKey || failedKey === imageKey) return placeholder;
  return (
    <img
      src={`${API_BASE}/v1/media/attachments?key=${encodeURIComponent(imageKey)}`}
      alt=""
      loading="lazy"
      onError={() => setFailedKey(imageKey)}
      className="h-full w-full object-cover"
    />
  );
};

/**
 * Product cards the agent sent, as a chip and a row of cards the way the customer saw
 * them. `cards` are { code, title, subtitle, image_key }; `codes` alone come from a raw
 * product_cards item in agent activity.
 * @param {{ cards?: { code?: string, title: string, subtitle?: string, image_key?: string|null }[],
 *   codes?: string[], inverted?: boolean }} props  inverted: drawn inside a dark (sent) bubble.
 */
export default function ProductCardsMessage({ cards = [], codes = [], inverted = false }) {
  const count = cards.length || codes.length;
  const hasImages = cards.some(card => card.image_key);
  return (
    <div className="product-cards-message space-y-2">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${inverted ? 'bg-white/15 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
        <LayoutGrid size={11} aria-hidden="true" />
        Product cards · {count}
      </span>
      {cards.length > 0 ? (
        <ul className="m-0 flex list-none snap-x gap-2 overflow-x-auto p-0 pb-1" aria-label="Products sent">
          {cards.map((card, index) => (
            <li
              key={`${card.code || card.title}-${index}`}
              className={`product-card w-40 shrink-0 snap-start overflow-hidden rounded-xl border ${inverted ? 'border-white/15 bg-white/10' : 'border-slate-200 bg-slate-50'}`}
            >
              {hasImages && (
                <div className="aspect-[4/3] w-full">
                  <CardImage imageKey={card.image_key} inverted={inverted} />
                </div>
              )}
              <div className="px-3 py-2">
                <p className="m-0 line-clamp-2 text-[13px] font-semibold leading-snug">{card.title}</p>
                {card.subtitle && (
                  <p className={`m-0 mt-1 text-[12px] leading-snug ${inverted ? 'text-white/70' : 'text-slate-500'}`}>{card.subtitle}</p>
                )}
                {card.code && (
                  <p className={`m-0 mt-1 font-mono text-[10.5px] ${inverted ? 'text-white/50' : 'text-slate-400'}`}>{card.code}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-1.5" aria-label="Product codes sent">
          {codes.map(code => (
            <code key={code} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              {code}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}
