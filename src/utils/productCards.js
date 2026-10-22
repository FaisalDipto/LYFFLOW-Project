// The sale agent's product cards (Meta generic template). The thread stores them as a
// text message: "[Product cards] Name — ৳650 (Regular ৳1500) · Other name — ৳550".
export const PRODUCT_CARDS_PREFIX = '[Product cards]';

/**
 * @param {unknown} text
 * @returns {{ name: string, price: string }[] | null} The cards, or null for any other message.
 */
export const parseProductCardsText = (text) => {
  if (typeof text !== 'string' || !text.startsWith(PRODUCT_CARDS_PREFIX)) return null;
  return text
    .slice(PRODUCT_CARDS_PREFIX.length)
    .split(' · ')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const split = part.lastIndexOf(' — ');
      return split > 0
        ? { name: part.slice(0, split).trim(), price: part.slice(split + 3).trim() }
        : { name: part, price: '' };
    });
};
