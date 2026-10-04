// An invite link opened while logged out has to survive the Google OAuth round trip,
// which always lands on /businesses. sessionStorage keeps it to this tab only.
const PENDING_INVITE_KEY = 'lyfflow_pending_invite';

export const savePendingInvite = (token) => {
  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, token);
  } catch {
    // Storage blocked; the user can reopen the invite link after signing in.
  }
};

export const takePendingInvite = () => {
  try {
    const token = sessionStorage.getItem(PENDING_INVITE_KEY);
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    return token;
  } catch {
    return null;
  }
};
