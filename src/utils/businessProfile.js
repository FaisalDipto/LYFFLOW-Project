// Shared rules for the business profile fields used by the create form and the
// settings form. The backend is the authority (it also reformats phone numbers to
// E.164); these checks only catch obvious mistakes before the request.

// Digits with optional +, spaces, dashes, dots and brackets: "+880 1712-345678".
// Every symbol in the class is escaped: browsers compile `pattern` with the `v` flag,
// where an unescaped ( ) or . makes the whole pattern invalid and silently ignored.
export const PHONE_PATTERN = '^\\+?[0-9\\s\\(\\)\\.\\-]{6,50}$';
export const PHONE_HINT = 'Use digits, with an optional + and country code, e.g. +8801712345678.';

const FIELD_LABELS = {
  name: 'Business name',
  phone_number: 'Phone number',
  country: 'Country',
  timezone: 'Timezone',
  website: 'Website',
  email: 'Email',
  currency: 'Currency',
};

// apiFetch flattens a 422 into "body.phone_number: Value error, ..." (joined with " | ").
// This names the field the way the form does and drops the validator prefix.
export const describeBusinessError = (err, fallback) => {
  const message = err?.message || fallback;
  if (err?.status !== 422) return message;
  return message
    .split(' | ')
    .map(part => part
      .replace(/^body\.([a-z_]+):\s*/, (_, field) => `${FIELD_LABELS[field] || field}: `)
      .replace(/Value error,\s*/i, ''))
    .join(' ');
};

// Optional text fields go out as null when blank, which also clears them on PATCH.
export const optionalText = (value) => {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed : null;
};
