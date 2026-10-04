import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Moon, Sun } from 'lucide-react';
import logoImg from '../assets/logo1.webp';
import titleImg from '../assets/title.webp';
import RoleBadge from '../components/RoleBadge';
import { apiService } from '../services/api';
import { savePendingInvite } from '../services/pendingInvite';
import { useSiteTheme } from '../hooks/useSiteTheme';

const Card = ({ children }) => (
  <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none sm:p-8">
    {children}
  </div>
);

const primaryButton = 'inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-emerald-400';
const secondaryButton = 'inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 no-underline transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-slate-300';

/**
 * Landing for {FRONTEND}/invite?token=... from the invitation email.
 * Logged-out visitors are sent through Google sign-in; the token is parked in
 * sessionStorage and /businesses brings them back here afterwards.
 */
export default function Invite() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useSiteTheme();
  const token = new URLSearchParams(location.search).get('token');

  // checking | signed-out | ready | done | error
  const [status, setStatus] = useState(token ? 'checking' : 'error');
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(token ? '' : 'This invitation link is missing its token.');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await apiService.getUserProfile();
      } catch (err) {
        if (cancelled) return;
        if (err.status === 401) {
          setStatus('signed-out');
        } else {
          setError('We could not check your account. Please try again.');
          setStatus('error');
        }
        return;
      }
      // Pending invitations carry the business name and id the accept response lacks.
      const invitations = await apiService.getMyInvitations().catch(() => []);
      if (cancelled) return;
      setInvite((Array.isArray(invitations) ? invitations : []).find(item => item.invite_token === token) || null);
      setStatus('ready');
    })();
    return () => { cancelled = true; };
  }, [token]);

  const signIn = () => {
    savePendingInvite(token);
    navigate('/get-started');
  };

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      await apiService.acceptInvite(token);
      if (invite?.business_id) {
        await apiService.switchBusiness(invite.business_id);
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/businesses', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Could not accept this invitation.');
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    setError('');
    try {
      await apiService.rejectInvite(token);
      setStatus('done');
    } catch (err) {
      setError(err.message || 'Could not decline this invitation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-theme={theme} style={{ colorScheme: theme }} className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-[#0b0f17] dark:text-slate-100">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImg} alt="LYFFLOW logo" style={{ height: '34px', width: 'auto' }} className="dark:invert" />
          <img src={titleImg} alt="LYFFLOW" style={{ height: '17px', width: 'auto' }} className="dark:invert" />
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:items-center sm:pt-0">
        <Card>
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300">
            <Mail size={26} />
          </span>

          {status === 'checking' && (
            <p className="m-0 text-sm text-slate-500 dark:text-slate-400">Checking your invitation...</p>
          )}

          {status === 'signed-out' && (
            <>
              <h1 className="m-0 text-2xl font-black tracking-tight">You've been invited</h1>
              <p className="mb-6 mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Sign in with the Google account this invitation was sent to. We'll bring you back here to accept it.
              </p>
              <button type="button" onClick={signIn} className={primaryButton}>Sign in to accept</button>
            </>
          )}

          {status === 'ready' && (
            <>
              <h1 className="m-0 text-2xl font-black tracking-tight">
                {invite ? `Join ${invite.business_name}` : 'Accept invitation'}
              </h1>
              <p className="mb-6 mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                {invite
                  ? <>You've been invited as <RoleBadge role={invite.role} /></>
                  : 'Accept to join the business that invited you.'}
              </p>
              {error && (
                <p role="alert" className="mb-4 mt-0 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-left text-sm font-semibold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
              )}
              <div className="flex flex-col gap-2.5">
                <button type="button" onClick={accept} disabled={busy} className={primaryButton}>{busy ? 'Working...' : 'Accept invitation'}</button>
                <button type="button" onClick={decline} disabled={busy} className={secondaryButton}>Decline</button>
              </div>
            </>
          )}

          {status === 'done' && (
            <>
              <h1 className="m-0 text-2xl font-black tracking-tight">Invitation declined</h1>
              <p className="mb-6 mt-2 text-sm text-slate-500 dark:text-slate-400">You won't be added to that business.</p>
              <Link to="/businesses" className={secondaryButton}>Go to your businesses</Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="m-0 text-2xl font-black tracking-tight">Invitation unavailable</h1>
              <p className="mb-6 mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
              <Link to="/businesses" className={secondaryButton}>Go to your businesses</Link>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
