import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Check, LogOut, Mail, Moon, Plus, Sun, X } from 'lucide-react';
import logoImg from '../assets/logo1.webp';
import titleImg from '../assets/title.webp';
import { apiService, logoutUrl } from '../services/api';
import { takePendingInvite } from '../services/pendingInvite';
import { closeNotificationStream } from '../services/notificationStream';
import RoleBadge from '../components/RoleBadge';
import { useSiteTheme } from '../hooks/useSiteTheme';

const CURRENCIES = [
  { value: 'BDT', label: 'BDT — Bangladeshi Taka' },
  { value: 'USD', label: 'USD — US Dollar' },
];

const formatExpiry = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const CreateBusinessForm = ({ onCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name for your business.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiService.createBusiness({ name: trimmed, currency });
      onCreated();
    } catch (err) {
      setError(err.status === 409
        ? 'You already own a business. Each account can own one business; you can still join others by invitation.'
        : err.message || 'Could not create the business.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-base font-black text-slate-950 dark:text-white">Create your business</h2>
          <p className="mb-0 mt-1 text-sm text-slate-500 dark:text-slate-400">Your pages, agents and orders will live inside it. You can invite your team afterwards.</p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} aria-label="Cancel" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      <label htmlFor="business-name" className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Business name</label>
      <input
        id="business-name"
        type="text"
        value={name}
        maxLength={100}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Dhaka Leather Co."
        disabled={submitting}
        autoFocus
        className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
      />

      <label htmlFor="business-currency" className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Currency</label>
      <select
        id="business-currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        disabled={submitting}
        className="mb-5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15 dark:bg-slate-900 dark:text-white"
      >
        {CURRENCIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>

      {error && (
        <p role="alert" className="mb-4 mt-0 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-emerald-400"
      >
        {submitting ? 'Creating...' : 'Create business'}
        {!submitting && <ArrowRight size={16} />}
      </button>
    </form>
  );
};

export default function Businesses() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useSiteTheme();

  const [businesses, setBusinesses] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [showCreate, setShowCreate] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const [inviteBusy, setInviteBusy] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('auth') === 'success') return 'Signed in. Choose a business to continue.';
    if (params.get('reason') === 'no_business') return 'Choose a business to open the dashboard.';
    if (params.get('reason') === 'deleted') return 'The business was deleted.';
    return '';
  });

  const load = useCallback(async () => {
    setError('');
    try {
      const [businessList, inviteList] = await Promise.all([
        apiService.getBusinesses(),
        // Invitations are a convenience here; a failure shouldn't block the selector.
        apiService.getMyInvitations().catch(() => []),
      ]);
      const list = Array.isArray(businessList) ? businessList : [];
      setBusinesses(list);
      setInvitations(Array.isArray(inviteList) ? inviteList : []);
      setShowCreate(list.length === 0);
      setStatus('ready');
    } catch (err) {
      if (err.status === 401) {
        navigate('/get-started', { replace: true });
        return;
      }
      setStatus('error');
    }
  }, [navigate]);

  useEffect(() => {
    // Strip the one-shot query flags so a refresh doesn't replay the notice.
    if (location.search) navigate(location.pathname, { replace: true });

    // An invite link opened while logged out resumes here after Google sign-in.
    const pendingInvite = takePendingInvite();
    if (pendingInvite) {
      navigate(`/invite?token=${encodeURIComponent(pendingInvite)}`, { replace: true });
      return;
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openBusiness = async (businessId) => {
    setSwitchingId(businessId);
    setError('');
    try {
      await apiService.switchBusiness(businessId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.status === 403
        ? 'You are no longer a member of that business.'
        : err.message || 'Could not open that business.');
      setSwitchingId(null);
      load();
    }
  };

  const respondToInvite = async (invite, accept) => {
    setInviteBusy(invite.invite_token);
    setError('');
    try {
      if (accept) {
        await apiService.acceptInvite(invite.invite_token);
        setNotice(`You joined ${invite.business_name}.`);
      } else {
        await apiService.rejectInvite(invite.invite_token);
        setNotice(`Invitation to ${invite.business_name} declined.`);
      }
      await load();
    } catch (err) {
      setError(err.message || 'Could not update the invitation.');
    } finally {
      setInviteBusy(null);
    }
  };

  const ownsBusiness = businesses.some(business => business.is_owner);

  return (
    <div data-theme={theme} style={{ colorScheme: theme }} className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-[#0b0f17] dark:text-slate-100">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImg} alt="LYFFLOW logo" style={{ height: '34px', width: 'auto' }} className="dark:invert" />
          <img src={titleImg} alt="LYFFLOW" style={{ height: '17px', width: 'auto' }} className="dark:invert" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:text-slate-900 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a
            href={logoutUrl()}
            onClick={() => closeNotificationStream()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 no-underline transition hover:text-slate-900 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
          >
            <LogOut size={14} /> Sign out
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Workspaces</span>
        <h1 className="m-0 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
          {status === 'ready' && businesses.length === 0 ? 'Set up your business' : 'Choose a business'}
        </h1>
        <p className="mb-8 mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          {status === 'ready' && businesses.length === 0
            ? 'Create a business to start connecting pages and building agents.'
            : 'Everything in the dashboard — pages, agents, orders — belongs to the business you open.'}
        </p>

        {notice && (
          <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
            <span className="flex items-center gap-2"><Check size={16} className="shrink-0" />{notice}</span>
            <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="shrink-0 text-emerald-700/70 hover:text-emerald-900 dark:text-emerald-300/70 dark:hover:text-emerald-200"><X size={16} /></button>
          </div>
        )}

        {error && (
          <p role="alert" className="mb-5 mt-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        )}

        {status === 'loading' && (
          <div className="space-y-3" aria-label="Loading businesses">
            {[0, 1].map(row => <div key={row} className="h-[76px] animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/5" />)}
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <p className="mb-4 mt-0 text-sm text-slate-600 dark:text-slate-300">We could not load your businesses.</p>
            <button type="button" onClick={() => { setStatus('loading'); load(); }} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 dark:bg-white dark:text-slate-950">Try again</button>
          </div>
        )}

        {status === 'ready' && (
          <div className="space-y-8">
            {invitations.length > 0 && (
              <section>
                <h2 className="mb-3 mt-0 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Pending invitations</h2>
                <div className="space-y-2.5">
                  {invitations.map(invite => {
                    const expires = formatExpiry(invite.invite_expires_at);
                    const busy = inviteBusy === invite.invite_token;
                    return (
                      <div key={invite.member_id} className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-400/20 dark:bg-sky-400/[0.06] sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 ring-1 ring-sky-200 dark:bg-white/5 dark:text-sky-300 dark:ring-sky-400/20"><Mail size={18} /></span>
                          <div className="min-w-0">
                            <p className="m-0 truncate text-sm font-black text-slate-900 dark:text-white">{invite.business_name}</p>
                            <p className="mb-0 mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              Invited as <RoleBadge role={invite.role} />
                              {expires && <span>· expires {expires}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" disabled={busy} onClick={() => respondToInvite(invite, false)} className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 sm:flex-none">Decline</button>
                          <button type="button" disabled={busy} onClick={() => respondToInvite(invite, true)} className="h-9 flex-1 rounded-lg bg-sky-600 px-3.5 text-xs font-bold text-white transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60 sm:flex-none">{busy ? 'Working...' : 'Accept'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {businesses.length > 0 && (
              <section>
                <h2 className="mb-3 mt-0 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Your businesses</h2>
                <div className="space-y-2.5">
                  {businesses.map(business => {
                    const isSwitching = switchingId === business.business_id;
                    return (
                      <button
                        type="button"
                        key={business.business_id}
                        onClick={() => openBusiness(business.business_id)}
                        disabled={Boolean(switchingId)}
                        className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md disabled:cursor-wait disabled:hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-emerald-400/40"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base font-black text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-700 dark:bg-white/5 dark:text-slate-200 dark:group-hover:bg-emerald-400/10 dark:group-hover:text-emerald-300">
                          {(business.name || '?').charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{business.name}</span>
                          <span className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <RoleBadge role={business.role} />
                            <span>{business.currency}</span>
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-400 transition group-hover:text-emerald-600 dark:group-hover:text-emerald-300">
                          {isSwitching ? 'Opening...' : 'Open'}
                          {!isSwitching && <ArrowRight size={15} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {showCreate ? (
              <CreateBusinessForm
                onCreated={() => navigate('/dashboard')}
                onCancel={businesses.length > 0 ? () => setShowCreate(false) : null}
              />
            ) : ownsBusiness ? (
              <p className="m-0 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Building2 size={14} className="shrink-0" />
                Each account can own one business. You can still join other businesses by invitation.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-transparent p-4 text-sm font-bold text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-white/15 dark:text-slate-300 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-400/5 dark:hover:text-emerald-300"
              >
                <Plus size={16} /> Create new business
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
