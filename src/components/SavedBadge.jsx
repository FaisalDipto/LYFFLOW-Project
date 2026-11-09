import { Check } from 'lucide-react';

/**
 * "Saved" with a check that pops in once, for a moment after something saves.
 * Render it only while it should show.
 */
export default function SavedBadge({ label = 'Saved', className = '' }) {
  return (
    <span role="status" className={`inline-flex items-center gap-1 font-semibold text-emerald-700 ${className}`}>
      <span className="lf-saved-check inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white">
        <Check size={10} strokeWidth={3} aria-hidden="true" />
      </span>
      {label}
    </span>
  );
}
