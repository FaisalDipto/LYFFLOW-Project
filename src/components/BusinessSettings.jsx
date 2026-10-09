import { useCallback, useEffect, useState } from 'react';
import { Copy, Mail, Trash2, UserPlus } from 'lucide-react';
import RoleBadge from './RoleBadge';
import { apiService } from '../services/api';
import { useBusiness } from '../context/BusinessContext';
import { usePlanGate } from '../context/PlanGateContext';
import TimezoneSelect from './TimezoneSelect';
import { describeBusinessError, optionalText, PHONE_HINT, PHONE_PATTERN } from '../utils/businessProfile';

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50';
const labelClass = 'mb-2 block text-[13.5px] font-semibold text-slate-800';
const primaryButtonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60';

const Alert = ({ tone = 'error', children }) => (
  <p
    role={tone === 'error' ? 'alert' : 'status'}
    className={`business-settings-alert is-${tone} mb-4 mt-0 rounded-lg border px-3.5 py-2.5 text-[13px] font-semibold leading-5 ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
  >
    {children}
  </p>
);

const SectionHeading = ({ title, description }) => (
  <div className="mb-5">
    <h3 className="m-0 text-[17px] font-bold text-slate-900">{title}</h3>
    {description && <p className="mb-0 mt-1.5 text-[13.5px] text-slate-500">{description}</p>}
  </div>
);

// The editable profile, as the form holds it (blank strings, not nulls).
const profileFromBusiness = (business) => ({
  name: business?.name || '',
  currency: business?.currency || 'BDT',
  phone_number: business?.phone_number || '',
  email: business?.email || '',
  website: business?.website || '',
  country: business?.country || '',
  timezone: business?.timezone || 'UTC',
});

const sameProfile = (a, b) => Object.keys(a).every(key => a[key].trim() === b[key].trim());

/** Business profile (admin+) and deletion (owner only). */
export const BusinessDetailsSettings = ({ onBusinessDeleted }) => {
  const { business, canManage, isOwner, refreshBusiness } = useBusiness();
  const saved = profileFromBusiness(business);
  const [form, setForm] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { tone, text }
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Reload the form when the saved business changes (after a save, or a switch).
  const savedKey = JSON.stringify(saved);
  useEffect(() => {
    setForm(JSON.parse(savedKey));
  }, [savedKey]);

  const isDirty = !sameProfile(form, saved);
  const update = (field) => (event) => setForm(current => ({ ...current, [field]: event.target.value }));

  const handleSave = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const phone = form.phone_number.trim();
    if (!name) {
      setMessage({ tone: 'error', text: 'The business name cannot be empty.' });
      return;
    }
    if (!phone) {
      setMessage({ tone: 'error', text: 'The business needs a phone number.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      // Blank optional fields are sent as null, which clears them.
      await apiService.updateBusiness({
        name,
        currency: form.currency,
        phone_number: phone,
        email: optionalText(form.email),
        website: optionalText(form.website),
        country: optionalText(form.country),
        timezone: form.timezone || 'UTC',
      });
      await refreshBusiness();
      setMessage({ tone: 'success', text: 'Business details saved.' });
    } catch (err) {
      setMessage({ tone: 'error', text: describeBusinessError(err, 'Could not save the business details.') });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setMessage(null);
    try {
      await apiService.deleteBusiness();
      onBusinessDeleted();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Could not delete the business.' });
      setDeleting(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSave}>
        <SectionHeading
          title="Business details"
          description={canManage
            ? 'How customers and your team reach the business, and the currency and timezone it runs on.'
            : 'Only the owner and admins can change these details.'}
        />

        {message && <Alert tone={message.tone}>{message.text}</Alert>}

        <fieldset disabled={!canManage || saving} className="m-0 mb-6 grid min-w-0 grid-cols-1 gap-4 border-0 p-0 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="settings-business-name" className={labelClass}>Business name</label>
            <input id="settings-business-name" type="text" required value={form.name} maxLength={100} onChange={update('name')} className={inputClass} />
          </div>

          <div>
            <label htmlFor="settings-business-phone" className={labelClass}>Contact phone</label>
            <input
              id="settings-business-phone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              minLength={6}
              maxLength={50}
              pattern={PHONE_PATTERN}
              title={PHONE_HINT}
              value={form.phone_number}
              onChange={update('phone_number')}
              placeholder="+8801712345678"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="settings-business-email" className={labelClass}>Official email <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="settings-business-email" type="email" autoComplete="email" value={form.email} onChange={update('email')} placeholder="hello@example.com" className={inputClass} />
          </div>

          <div>
            <label htmlFor="settings-business-website" className={labelClass}>Website <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="settings-business-website" type="url" maxLength={255} autoComplete="url" value={form.website} onChange={update('website')} placeholder="https://example.com" className={inputClass} />
          </div>

          <div>
            <label htmlFor="settings-business-country" className={labelClass}>Country <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="settings-business-country" type="text" maxLength={100} autoComplete="country-name" value={form.country} onChange={update('country')} placeholder="e.g. Bangladesh" className={inputClass} />
          </div>

          <div>
            <label htmlFor="settings-business-timezone" className={labelClass}>Operating timezone</label>
            <TimezoneSelect id="settings-business-timezone" value={form.timezone} onChange={timezone => setForm(current => ({ ...current, timezone }))} className={inputClass} />
          </div>

          <div>
            <label htmlFor="settings-business-currency" className={labelClass}>Currency</label>
            <select id="settings-business-currency" value={form.currency} onChange={update('currency')} className={inputClass}>
              <option value="BDT">BDT — Bangladeshi Taka</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>
        </fieldset>

        {canManage && (
          <button type="submit" disabled={saving || !isDirty} className={primaryButtonClass}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        )}
      </form>

      {isOwner && (
        <section className="business-settings-danger mt-10 rounded-xl border border-red-200 p-5">
          <h3 className="m-0 text-[15px] font-bold text-red-700">Delete business</h3>
          <p className="mb-4 mt-1.5 text-[13px] leading-5 text-slate-600">
            Removes every member and disconnects all pages. Conversation and order history stays on the pages but this business can't be restored.
          </p>
          {confirmingDelete ? (
            <div>
              <label htmlFor="delete-business-confirm" className="mb-2 block text-[13px] font-semibold text-slate-800">
                Type <strong>{business?.name}</strong> to confirm
              </label>
              <input
                id="delete-business-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                disabled={deleting}
                className={`${inputClass} mb-3`}
                autoComplete="off"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setConfirmingDelete(false); setDeleteConfirmText(''); }}
                  disabled={deleting}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || deleteConfirmText.trim() !== (business?.name || '').trim()}
                  className="h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete permanently'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} /> Delete this business
            </button>
          )}
        </section>
      )}
    </div>
  );
};

/** Member list for everyone; invite/remove for admin+; role changes for the owner. */
export const BusinessMembersSettings = () => {
  const { canManage, isOwner } = useBusiness();
  const { requireActivePlan } = usePlanGate();
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [message, setMessage] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [busyMemberId, setBusyMemberId] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const list = await apiService.getBusinessMembers();
      // Revoked rows are history, not team members.
      setMembers((Array.isArray(list) ? list : []).filter(member => member.status !== 'revoked'));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async (event) => {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    if (!requireActivePlan('invite-member')) return;
    setInviting(true);
    setMessage(null);
    setInviteLink('');
    try {
      const invite = await apiService.inviteBusinessMember(email, inviteRole);
      setInviteEmail('');
      setMessage({ tone: 'success', text: `Invitation sent to ${invite?.invited_email || email}.` });
      // Only present when the server has no mail transport (local/dev).
      if (invite?.invite_link) setInviteLink(invite.invite_link);
      await loadMembers();
    } catch (err) {
      // 402 covers both "no active plan" and "member limit reached".
      const text = err.status === 402
        ? "Your plan doesn't allow more team members, or there is no active plan. The owner can choose or upgrade a plan to invite more people."
        : err.status === 409
          ? 'That email already has an open invitation.'
          : err.message || 'Could not send the invitation.';
      setMessage({ tone: 'error', text });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member, role) => {
    setBusyMemberId(member.member_id);
    setMessage(null);
    try {
      await apiService.updateBusinessMemberRole(member.member_id, role);
      await loadMembers();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Could not change the role.' });
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemove = async (member) => {
    const label = member.status === 'invited' ? 'Cancel the invitation to' : 'Remove';
    if (!window.confirm(`${label} ${member.invited_email}?`)) return;
    setBusyMemberId(member.member_id);
    setMessage(null);
    try {
      await apiService.removeBusinessMember(member.member_id);
      await loadMembers();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Could not remove the member.' });
    } finally {
      setBusyMemberId(null);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked; the link stays visible for manual copying.
    }
  };

  return (
    <div>
      <SectionHeading
        title="Team members"
        description={canManage
          ? 'Admins can manage pages, agents and knowledge. Members can work the inbox, orders and leads.'
          : 'People with access to this business.'}
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {inviteLink && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 mt-0 text-xs font-semibold text-slate-600">Email isn't configured on this server. Share this link instead:</p>
          <div className="flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800">{inviteLink}</code>
            <button type="button" onClick={copyInviteLink} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100">
              <Copy size={13} /> {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="space-y-2">
          {[0, 1, 2].map(row => <div key={row} className="h-[60px] animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl border border-slate-200 p-5 text-center">
          <p className="mb-3 mt-0 text-sm text-slate-600">Could not load team members.</p>
          <button type="button" onClick={() => { setStatus('loading'); loadMembers(); }} className={primaryButtonClass}>Try again</button>
        </div>
      )}

      {status === 'ready' && (
        <ul className="m-0 mb-7 list-none space-y-2 p-0">
          {members.map(member => {
            const isOwnerRow = member.role === 'owner';
            const busy = busyMemberId === member.member_id;
            return (
              <li key={member.member_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                  {(member.invited_email || '?').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[13.5px] font-semibold text-slate-900">{member.invited_email}</p>
                  <p className="mb-0 mt-0.5 text-xs text-slate-500">
                    {member.status === 'invited' ? 'Invitation pending' : 'Active'}
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-3">
                  {isOwner && !isOwnerRow ? (
                    // The forms plugin draws the chevron inside the right padding, so pr-9
                    // keeps the label clear of it; a smaller px-* would let them overlap.
                    <select
                      aria-label={`Role for ${member.invited_email}`}
                      value={member.role}
                      disabled={busy}
                      onChange={(e) => handleRoleChange(member, e.target.value)}
                      className="h-9 min-w-[7.5rem] cursor-pointer rounded-lg border border-slate-200 bg-white py-0 pl-3 pr-9 text-[13px] font-semibold text-slate-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                  {canManage && !isOwnerRow && (
                    <button
                      type="button"
                      onClick={() => handleRemove(member)}
                      disabled={busy}
                      aria-label={`Remove ${member.invited_email}`}
                      title={member.status === 'invited' ? 'Cancel invitation' : 'Remove member'}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-red-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManage && (
        <form onSubmit={handleInvite} className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <p className="mb-3 mt-0 flex items-center gap-2 text-sm font-bold text-slate-800">
            <UserPlus size={16} className="text-emerald-600" /> Invite someone
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
                aria-label="Email address to invite"
                className={`${inputClass} pl-9`}
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              disabled={inviting}
              aria-label="Role"
              className="h-[42px] cursor-pointer rounded-lg border border-slate-200 bg-white py-0 pl-3 pr-9 text-sm font-semibold text-slate-700"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={inviting} className={primaryButtonClass}>
              {inviting ? 'Sending...' : 'Send invite'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
