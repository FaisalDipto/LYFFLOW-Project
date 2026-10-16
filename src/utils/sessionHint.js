// The session lives in an httpOnly cookie the page can't read, so this flag records
// that a session was seen, letting the landing page check it (and skip to the
// dashboard) without calling the API for visitors who never signed in. It's only a
// hint: the session itself is always confirmed with the backend.
const KEY = 'lyfflow_signed_in';

export const markSignedIn = () => {
  try { localStorage.setItem(KEY, '1'); } catch { /* storage blocked */ }
};

export const clearSignedIn = () => {
  try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
};

export const hasSignedInHint = () => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};
