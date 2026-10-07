import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CreditCard, X } from 'lucide-react';

// What each gated action is called in the prompt. Keys are the `action` values
// passed to requireActivePlan().
const GATED_ACTIONS = {
  'create-agent': { title: 'Creating an agent', detail: 'Agents answer your customers on Facebook and Instagram.' },
  'assign-agent': { title: 'Assigning an agent to a page', detail: 'An assigned agent replies to that page\'s messages.' },
  'invite-member': { title: 'Inviting a team member', detail: 'Team members share this workspace with you.' },
};

export default function UpgradeRequiredModal({ action, isOwner, onViewPlans, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const copy = GATED_ACTIONS[action] || { title: 'This action', detail: '' };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-required-title"
        onClick={event => event.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-2xl animate-scale-in"
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
          <X size={16} />
        </button>
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CreditCard size={18} />
        </span>
        <h2 id="upgrade-required-title" className="m-0 text-lg font-semibold text-slate-900">Upgrade required</h2>
        <p className="mb-0 mt-2 text-sm leading-6 text-slate-500">
          {copy.title} needs an active plan. {copy.detail}{' '}
          {isOwner
            ? 'Choose a plan to continue; everything else in your workspace stays available.'
            : 'Ask the business owner to choose a plan.'}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {isOwner ? 'Not now' : 'Close'}
          </button>
          {isOwner && (
            <button type="button" onClick={onViewPlans} autoFocus className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
              View plans
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
