// The sale agent's product cards (Meta generic template). Messages carry them as
// `product_cards` ([{ code, title, subtitle, image_key }]); `message` holds a plain-text
// version, "[Product cards] Name (Code: X) — ৳650 (Regular ৳1500) · Other — ৳550", which
// is all that card messages stored before the field existed have.
export const PRODUCT_CARDS_PREFIX = '[Product cards]';

/**
 * Cards from the plain-text version.
 * @param {unknown} text
 * @returns {{ code: string, title: string, subtitle: string, image_key: null }[] | null} null for any other message.
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
      const name = split > 0 ? part.slice(0, split).trim() : part;
      const codeMatch = /\s*\(Code:\s*([^)]+)\)\s*$/.exec(name);
      return {
        code: codeMatch ? codeMatch[1].trim() : '',
        title: codeMatch ? name.slice(0, codeMatch.index).trim() : name,
        subtitle: split > 0 ? part.slice(split + 3).trim() : '',
        image_key: null,
      };
    });
};

/**
 * A message's product cards: the `product_cards` field, else parsed from the text.
 * @returns {{ code: string, title: string, subtitle: string, image_key: string|null }[] | null}
 */
export const messageProductCards = (message) => {
  if (Array.isArray(message?.product_cards) && message.product_cards.length) return message.product_cards;
  return parseProductCardsText(message?.message ?? message?.text ?? message?.content);
};
