import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Building2, ChevronRight, LogOut, Moon, Sun, User, Users, X } from 'lucide-react';
import { ROLE_LABELS } from '../../context/BusinessContext';
import './ProfilePanel.css';

const Avatar = ({ user, initial, size }) => {
  const [failedUrl, setFailedUrl] = useState(null);
  const url = user?.profile_pic_url;
  return (
    <span className="pp-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>
      {url && failedUrl !== url
        ? <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
        : initial}
    </span>
  );
};

/**
 * The account panel under the profile button: who is signed in, the business and plan,
 * appearance, and account actions. Closes on Escape, an outside click, or an action.
 * @param {{ open: boolean, onClose: () => void, anchorRef: React.RefObject<HTMLElement>,
 *   user: object, business: object|null, role: string|null, planName: string|null,
 *   isDark: boolean, onToggleTheme: () => void,
 *   onOpenSettings: (tab: 'profile'|'business'|'team') => void, onOpenSubscription: (() => void)|null,
 *   onSwitchBusiness: () => void, onLogout: () => void }} props
 */
export default function ProfilePanel({
  open, onClose, anchorRef, user, business, role, planName, isDark, onToggleTheme,
  onOpenSettings, onOpenSubscription, onSwitchBusiness, onLogout,
}) {
  const panelRef = useRef(null);
  const displayName = user?.display_name || user?.email || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus({ preventScroll: true });
    const handleKey = (event) => {
      if (event.key !== 'Escape') return;
      onClose();
      anchorRef?.current?.focus();
    };
    const handlePointer = (event) => {
      if (panelRef.current?.contains(event.target) || anchorRef?.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerdown', handlePointer);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('pointerdown', handlePointer);
    };
  }, [anchorRef, onClose, open]);

  const run = (action) => () => {
    onClose();
    action();
  };

  return (
    <div
      ref={panelRef}
      className="pp-panel"
      data-open={open ? 'true' : 'false'}
      data-theme={isDark ? 'dark' : 'light'}
      role="dialog"
      aria-label="Account"
      aria-hidden={open ? undefined : 'true'}
      inert={!open}
      tabIndex={-1}
    >
      <div className="pp-head">
        <Avatar user={user} initial={initial} size={44} />
        <div className="pp-who">
          <p className="pp-name">{displayName}</p>
          {user?.email && user.email !== displayName && <p className="pp-email">{user.email}</p>}
        </div>
        <button type="button" className="pp-icon-button" onClick={onClose} aria-label="Close">
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      {business && (
        <div className="pp-card">
          <div className="pp-row">
            <span className="pp-row-icon"><Building2 size={16} strokeWidth={1.75} aria-hidden="true" /></span>
            <div className="pp-row-text">
              <p className="pp-row-title">{business.name}</p>
              <p className="pp-row-meta">{ROLE_LABELS[role] || role || 'Member'}</p>
            </div>
            <button type="button" className="pp-link" onClick={run(onSwitchBusiness)}>Switch</button>
          </div>
          {planName && (
            <div className="pp-row">
              <span className="pp-row-icon pp-plan-dot" aria-hidden="true" />
              <div className="pp-row-text">
                <p className="pp-row-title">{planName} plan</p>
                <p className="pp-row-meta">Current subscription</p>
              </div>
              {onOpenSubscription && <button type="button" className="pp-link" onClick={run(onOpenSubscription)}>Manage</button>}
            </div>
          )}
        </div>
      )}

      <div className="pp-appearance">
        <span className="pp-section-label" id="pp-appearance-label">Appearance</span>
        <div className="pp-segmented" role="radiogroup" aria-labelledby="pp-appearance-label">
          <button type="button" role="radio" aria-checked={!isDark} onClick={() => { if (isDark) onToggleTheme(); }}>
            <Sun size={14} strokeWidth={1.75} aria-hidden="true" /> Light
          </button>
          <button type="button" role="radio" aria-checked={isDark} onClick={() => { if (!isDark) onToggleTheme(); }}>
            <Moon size={14} strokeWidth={1.75} aria-hidden="true" /> Dark
          </button>
        </div>
      </div>

      <nav className="pp-menu" aria-label="Account">
        <button type="button" className="pp-menu-item" onClick={run(() => onOpenSettings('profile'))}>
          <User size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>Account settings</span>
          <ChevronRight size={15} strokeWidth={1.75} className="pp-chevron" aria-hidden="true" />
        </button>
        <button type="button" className="pp-menu-item" onClick={run(() => onOpenSettings('business'))}>
          <Building2 size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>Business settings</span>
          <ChevronRight size={15} strokeWidth={1.75} className="pp-chevron" aria-hidden="true" />
        </button>
        <button type="button" className="pp-menu-item" onClick={run(() => onOpenSettings('team'))}>
          <Users size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>Team</span>
          <ChevronRight size={15} strokeWidth={1.75} className="pp-chevron" aria-hidden="true" />
        </button>
        <button type="button" className="pp-menu-item" onClick={run(onSwitchBusiness)}>
          <ArrowLeftRight size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>Switch business</span>
          <ChevronRight size={15} strokeWidth={1.75} className="pp-chevron" aria-hidden="true" />
        </button>
      </nav>

      <div className="pp-footer">
        <button type="button" className="pp-menu-item pp-logout" onClick={run(onLogout)}>
          <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
