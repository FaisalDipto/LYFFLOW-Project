import { LayoutGrid } from 'lucide-react';

/**
 * Product cards the agent sent, as a chip and a row of cards. `cards` come from the
 * thread's text rendering ({ name, price }); `codes` from a raw product_cards item.
 * @param {{ cards?: { name: string, price: string }[], codes?: string[], inverted?: boolean }} props
 *   inverted: drawn inside a dark (sent) bubble.
 */
export default function ProductCardsMessage({ cards = [], codes = [], inverted = false }) {
  const count = cards.length || codes.length;
  return (
    <div className="product-cards-message space-y-2">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${inverted ? 'bg-white/15 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
        <LayoutGrid size={11} aria-hidden="true" />
        Product cards · {count}
      </span>
      {cards.length > 0 ? (
        <ul className="flex snap-x gap-2 overflow-x-auto pb-1" aria-label="Products sent">
          {cards.map((card, index) => (
            <li
              key={`${card.name}-${index}`}
              className={`product-card w-40 shrink-0 snap-start rounded-xl border px-3 py-2 ${inverted ? 'border-white/15 bg-white/10' : 'border-slate-200 bg-slate-50'}`}
            >
              <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{card.name}</p>
              {card.price && (
                <p className={`mt-1 text-[12px] leading-snug ${inverted ? 'text-white/70' : 'text-slate-500'}`}>{card.price}</p>
              )}
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
