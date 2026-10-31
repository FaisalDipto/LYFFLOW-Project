import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ListFilter } from 'lucide-react';
import { INBOX_CATEGORIES } from '../../utils/inboxCategories';

/**
 * The inbox's category picker: one button showing the current category, opening a list
 * of all of them. A category other than "All contacts" tints the button so it reads as
 * an active filter.
 * @param {{ value: string, onChange: (id: string) => void }} props
 */
export default function InboxCategoryMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = INBOX_CATEGORIES.find(tab => tab.id === value) || INBOX_CATEGORIES[0];
  const filtered = current.id !== 'all';

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // Focus the chosen option so arrow keys and Enter work straight away.
    rootRef.current?.querySelector('[aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (id) => {
    onChange(id);
    setOpen(false);
  };

  // Up/Down move between options; Home/End jump to the ends.
  const onMenuKeyDown = (event) => {
    const items = [...rootRef.current.querySelectorAll('[role="menuitemradio"]')];
    const index = items.indexOf(document.activeElement);
    const go = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 }[event.key];
    if (go === undefined) return;
    event.preventDefault();
    items[(go + items.length) % items.length]?.focus();
  };

  return (
    <div ref={rootRef} className="inbox-category-menu relative mb-3">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-10 w-full items-center gap-2 rounded-xl border border-solid px-3 text-left text-[13px] transition-colors ${filtered ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
      >
        <ListFilter size={15} className={`shrink-0 ${filtered ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true" />
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">Category</span>
        <span className="min-w-0 flex-1 truncate font-bold">{current.label}</span>
        <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Conversation category"
          onKeyDown={onMenuKeyDown}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[60] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-fade-in-up"
        >
          {INBOX_CATEGORIES.map(tab => {
            const selected = tab.id === current.id;
            return (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                key={tab.id}
                onClick={() => choose(tab.id)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[13px] font-semibold transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${selected ? 'text-emerald-700' : 'text-slate-700'}`}
              >
                <span className="truncate">{tab.label}</span>
                {selected && <Check size={15} className="shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
          <p className="m-0 border-t border-slate-100 px-3 py-2 text-[11px] leading-4 text-slate-400">
            Categories list conversations handed to a person, by why the AI handed them over.
          </p>
        </div>
      )}
    </div>
  );
}
