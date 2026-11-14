// Phone numbers for display. The backend stores them in international form
// (+8801712345678); this spaces Bangladesh numbers the way they're written locally:
// "+880 1712-345678", or "01712-345678" for a number saved without the country code.
// Anything else is shown as stored rather than guessing another country's grouping.

/** A phone number spaced for reading; the input unchanged when it isn't a Bangladesh mobile. */
export function formatPhone(raw) {
  if (raw === null || raw === undefined) return '';
  const text = String(raw).trim();
  const digits = text.replace(/[\s().-]/g, '');
  const international = /^\+?880(1\d{9})$/.exec(digits);
  if (international) {
    const local = international[1];
    return `+880 ${local.slice(0, 4)}-${local.slice(4)}`;
  }
  const local = /^(01\d{9})$/.exec(digits);
  if (local) return `${local[1].slice(0, 5)}-${local[1].slice(5)}`;
  return text;
}
