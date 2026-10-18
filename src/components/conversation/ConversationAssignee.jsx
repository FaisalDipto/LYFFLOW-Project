import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, UserMinus, UserPlus } from 'lucide-react';
import { ROLE_LABELS } from '../../context/BusinessContext';
import { memberShortName } from '../../hooks/useTeamMembers';

const initial = (name) => (name || '?').charAt(0).toUpperCase();

/**
 * Who owns this conversation, in the chat header. Admins and owners can assign it to
 * an active teammate or unassign it; members see the assignee only.
 */
export default function ConversationAssignee({ assigneeId, team, canAssign, busy = false, onAssign }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const { members, byUserId, currentUserId } = team;
  const assignee = assigneeId ? byUserId.get(assigneeId) : null;
  const isMe = Boolean(assigneeId && assigneeId === currentUserId);
  const label = !assigneeId ? 'Unassigned' : isMe ? 'You' : assignee ? memberShortName(assignee) : 'Teammate';
  const assignable = members.filter(member => member.user_id);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (userId) => {
    setOpen(false);
    if ((userId || null) !== (assigneeId || null)) onAssign(userId);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => canAssign && setOpen(value => !value)}
        disabled={!canAssign && !assigneeId}
        aria-haspopup={canAssign ? 'menu' : undefined}
        aria-expanded={canAssign ? open : undefined}
        title={canAssign ? 'Assign this conversation' : assigneeId ? `Assigned to ${label === 'You' ? 'you' : label}` : 'Only admins and the owner can assign conversations'}
        className={`conversation-assignee-trigger flex h-9 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-black transition-colors md:px-2.5 ${assigneeId
          ? 'border-solid border-sky-200 bg-sky-50 text-sky-800'
          : 'border-dashed border-slate-300 bg-white text-slate-500'} ${canAssign ? 'cursor-pointer hover:border-slate-400' : 'cursor-default'} disabled:opacity-60`}
      >
        {busy ? (
          <Loader2 size={15} className="animate-spin" />
        ) : assigneeId ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-black text-white">{isMe ? 'Y' : initial(label)}</span>
        ) : (
          <UserPlus size={15} />
        )}
        <span className="hidden max-w-[96px] truncate lg:inline">{label}</span>
        {canAssign && <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl" role="menu">
          <p className="m-0 border-b border-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Assign to</p>
          {assignable.length === 0 ? (
            <p className="m-0 px-3 py-3 text-xs font-medium leading-5 text-slate-500">Team members can't be listed for assignment right now.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {assignable.map(member => {
                const selected = member.user_id === assigneeId;
                const you = member.user_id === currentUserId;
                return (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    key={member.user_id}
                    onClick={() => choose(member.user_id)}
                    className={`flex w-full items-center gap-2.5 border-0 px-3 py-2 text-left transition-colors hover:bg-slate-50 ${selected ? 'bg-sky-50' : 'bg-white'}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-600">{initial(memberShortName(member))}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-slate-800">{member.invited_email}{you ? ' (you)' : ''}</span>
                      <span className="block text-[10px] font-semibold text-slate-400">{ROLE_LABELS[member.role] || member.role}</span>
                    </span>
                    {selected && <Check size={15} className="shrink-0 text-sky-600" />}
                  </button>
                );
              })}
            </div>
          )}
          {assigneeId && (
            <button
              type="button"
              role="menuitem"
              onClick={() => choose(null)}
              className="flex w-full items-center gap-2 border-0 border-t border-solid border-slate-100 bg-white px-3 py-2.5 text-left text-[12px] font-bold text-rose-600 transition-colors hover:bg-rose-50"
            >
              <UserMinus size={15} /> Unassign
            </button>
          )}
        </div>
      )}
    </div>
  );
}
