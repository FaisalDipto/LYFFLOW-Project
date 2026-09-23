import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

const MENU_WIDTH = 176;

/**
 * Kebab button with a dropdown of row actions. The menu is portalled with fixed
 * positioning because table wrappers use overflow-x-auto, which would clip it.
 * actions: [{ key, label, icon, onSelect, disabled, hint, tone: 'danger' }]
 */
const RowActionsMenu = ({ actions, label = 'Row actions' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const close = () => setIsOpen(false);

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight || 0;
    const opensUp = rect.bottom + menuHeight + 8 > window.innerHeight && rect.top > menuHeight + 8;
    setPosition({
      top: opensUp ? rect.top - menuHeight - 6 : rect.bottom + 6,
      left: Math.max(8, rect.right - MENU_WIDTH),
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (e) => {
      if (menuRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      close();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { close(); buttonRef.current?.focus(); }
    };
    // Fixed coordinates go stale once anything scrolls or resizes, so just close.
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(e) => { e.stopPropagation(); setIsOpen(open => !open); }}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          isOpen
            ? 'border-slate-300 bg-slate-100 text-slate-900'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <MoreVertical size={17} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
            width: MENU_WIDTH,
            visibility: position ? 'visible' : 'hidden',
          }}
          className="z-[10000] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-left shadow-xl"
        >
          {actions.map(({ key, label: actionLabel, icon: Icon, onSelect, disabled, hint, tone }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => { close(); onSelect?.(); }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                tone === 'danger'
                  ? 'text-red-600 enabled:hover:bg-red-50'
                  : 'text-slate-700 enabled:hover:bg-slate-100 enabled:hover:text-slate-900'
              }`}
            >
              {Icon && <Icon size={15} className="shrink-0" />}
              <span className="flex-1">{actionLabel}</span>
              {hint && <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">{hint}</span>}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export default RowActionsMenu;
