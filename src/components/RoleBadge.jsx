import { ROLE_LABELS } from '../context/BusinessContext';

const ROLE_BADGE_CLASSES = {
  owner: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  admin: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20',
  member: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
};

const RoleBadge = ({ role }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1 ${ROLE_BADGE_CLASSES[role] || ROLE_BADGE_CLASSES.member}`}>
    {ROLE_LABELS[role] || role}
  </span>
);

export default RoleBadge;
