import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Settings, X } from 'lucide-react';
import './DashboardSidebar.css';

const DESKTOP_QUERY = '(min-width: 768px)';
const MENU_CLOSE_DELAY_MS = 180;

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
};

/** A label or menu beside a rail icon. Portalled: the sidebar clips and transforms its children. */
const RailPopover = ({ popover, activeTab, onSelect, onMenuEnter, onMenuLeave, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    if (popover?.kind !== 'menu') return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose({ restoreFocus: true });
    };
    const handlePointer = (event) => {
      if (!menuRef.current?.contains(event.target) && !popover.trigger?.contains(event.target)) onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerdown', handlePointer);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('pointerdown', handlePointer);
    };
  }, [onClose, popover]);

  if (!popover) return null;
  const { rect } = popover;

  if (popover.kind === 'tooltip') {
    return createPortal(
      <div className="lf-rail-tooltip" role="tooltip" style={{ top: rect.top + rect.height / 2, left: rect.right + 12 }}>
        {popover.label}
      </div>,
      document.body,
    );
  }

  const { item } = popover;
  const top = Math.max(8, Math.min(rect.top - 8, window.innerHeight - (56 + item.children.length * 38)));
  return createPortal(
    <div
      ref={menuRef}
      className="lf-rail-menu"
      role="menu"
      aria-label={item.label}
      style={{ top, left: rect.right + 10 }}
      onMouseEnter={onMenuEnter}
      onMouseLeave={onMenuLeave}
    >
      <p className="lf-rail-menu-title">{item.label}</p>
      {item.children.map((child, index) => (
        <button
          key={child.id}
          type="button"
          role="menuitem"
          autoFocus={popover.viaKeyboard && index === 0}
          className="lf-rail-menu-item"
          aria-current={activeTab === child.id ? 'page' : undefined}
          onClick={() => { onSelect(child.id); onClose(); }}
        >
          <child.icon size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>{child.label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
};

/**
 * The dashboard's navigation. On desktop it collapses to an icon rail (names as tooltips,
 * sub-pages in a flyout); on phones it is a drawer.
 * @param {{
 *   primaryItems: { id: string, icon: any, label: string, children?: { id: string, icon: any, label: string }[] }[],
 *   secondaryItems: { id: string, icon: any, label: string }[],
 *   activeTab: string, onSelect: (id: string) => void,
 *   collapsed: boolean, mobileOpen: boolean, onMobileClose: () => void,
 *   logoSrc: string, titleSrc: string, pagesCount: number, agentsCount: number,
 * }} props
 */
export default function DashboardSidebar({
  primaryItems, secondaryItems, activeTab, onSelect, collapsed, mobileOpen, onMobileClose,
  logoSrc, titleSrc, pagesCount, agentsCount,
}) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const rail = collapsed && isDesktop;
  // Groups start open when one of their pages is showing.
  const [expanded, setExpanded] = useState(() => Object.fromEntries(
    primaryItems.filter(item => item.children?.some(child => child.id === activeTab)).map(item => [item.id, true]),
  ));
  // Reaching a page from elsewhere (a "View more" link, an order's ad) opens its group,
  // so the current page is always visible in the sidebar.
  const [seenTab, setSeenTab] = useState(activeTab);
  if (seenTab !== activeTab) {
    setSeenTab(activeTab);
    const group = primaryItems.find(item => item.children?.some(child => child.id === activeTab));
    if (group && !expanded[group.id]) setExpanded(current => ({ ...current, [group.id]: true }));
  }
  const [popover, setPopover] = useState(null);
  const closeTimerRef = useRef(null);
  const menuTriggerRef = useRef(null);

  const cancelClose = useCallback(() => clearTimeout(closeTimerRef.current), []);
  const closePopover = useCallback(({ restoreFocus = false } = {}) => {
    clearTimeout(closeTimerRef.current);
    setPopover(null);
    if (restoreFocus) menuTriggerRef.current?.focus();
  }, []);
  const closeSoon = useCallback(() => {
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setPopover(null), MENU_CLOSE_DELAY_MS);
  }, []);
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const select = (id) => {
    setPopover(null);
    onSelect(id);
  };

  // Rail-only hover/focus handlers: the item's name, or a group's flyout.
  const tooltipProps = (label) => (rail ? {
    onMouseEnter: (event) => { cancelClose(); setPopover({ kind: 'tooltip', label, rect: event.currentTarget.getBoundingClientRect() }); },
    onMouseLeave: () => setPopover(current => (current?.kind === 'tooltip' ? null : current)),
    onFocus: (event) => setPopover({ kind: 'tooltip', label, rect: event.currentTarget.getBoundingClientRect() }),
    onBlur: () => setPopover(current => (current?.kind === 'tooltip' ? null : current)),
  } : {});
  const openMenu = (item, trigger, viaKeyboard = false) => {
    cancelClose();
    menuTriggerRef.current = trigger;
    setPopover({ kind: 'menu', item, trigger, viaKeyboard, rect: trigger.getBoundingClientRect() });
  };

  const renderItem = (item, { icon } = {}) => {
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        className="lf-item"
        aria-current={isActive ? 'page' : undefined}
        aria-label={rail ? item.label : undefined}
        onClick={() => select(item.id)}
        {...tooltipProps(item.label)}
      >
        <span className="lf-item-icon">{icon || <item.icon size={18} strokeWidth={1.75} aria-hidden="true" />}</span>
        <span className="lf-label">{item.label}</span>
      </button>
    );
  };

  const renderGroup = (item) => {
    const hasActiveChild = item.children.some(child => child.id === activeTab);
    const isOpen = Boolean(expanded[item.id]);
    const menuOpen = popover?.kind === 'menu' && popover.item.id === item.id;
    const railProps = rail ? {
      'aria-haspopup': 'menu',
      'aria-expanded': menuOpen,
      'aria-label': item.label,
      onMouseEnter: (event) => openMenu(item, event.currentTarget),
      onMouseLeave: closeSoon,
      onClick: (event) => (menuOpen ? closePopover() : openMenu(item, event.currentTarget, event.detail === 0)),
      onKeyDown: (event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); openMenu(item, event.currentTarget, true); }
      },
    } : {
      'aria-expanded': isOpen,
      onClick: () => setExpanded(current => ({ ...current, [item.id]: !current[item.id] })),
    };
    return (
      <div key={item.id} className="lf-group" data-open={isOpen ? 'true' : 'false'}>
        <button type="button" className="lf-item" data-active-group={hasActiveChild ? 'true' : undefined} data-menu-open={menuOpen ? 'true' : undefined} {...railProps}>
          <span className="lf-item-icon"><item.icon size={18} strokeWidth={1.75} aria-hidden="true" /></span>
          <span className="lf-label">{item.label}</span>
          <ChevronDown size={15} strokeWidth={1.75} className="lf-chevron" aria-hidden="true" />
        </button>
        <div className="lf-children" aria-hidden={rail || !isOpen ? 'true' : undefined}>
          <div className="lf-children-inner">
            {item.children.map(child => (
              <button
                key={child.id}
                type="button"
                className="lf-child"
                tabIndex={rail || !isOpen ? -1 : undefined}
                aria-current={activeTab === child.id ? 'page' : undefined}
                onClick={() => select(child.id)}
              >
                <child.icon size={15} strokeWidth={1.75} aria-hidden="true" />
                <span className="lf-label">{child.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const statusText = `${pagesCount} ${pagesCount === 1 ? 'page' : 'pages'} · ${agentsCount} ${agentsCount === 1 ? 'agent' : 'agents'}`;

  return (
    <>
      <aside
        className="lf-sidebar"
        data-rail={rail ? 'true' : 'false'}
        data-mobile-open={mobileOpen ? 'true' : 'false'}
        aria-label="Main navigation"
        onScroll={() => setPopover(null)}
      >
        <div className="lf-brand">
          <img src={logoSrc} alt="" width="32" height="32" className="lf-brand-mark" />
          <div className="lf-brand-text lf-label">
            <img src={titleSrc} alt="LYFFLOW" className="lf-brand-title" />
            <span className="lf-brand-sub">AI workspace</span>
          </div>
          <button type="button" className="lf-close" onClick={onMobileClose} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <div className="lf-scroll">
          {/* No "Workspace" heading: the brand above already says "AI workspace". */}
          <nav className="lf-nav lf-nav-first" aria-label="Workspace">
            {primaryItems.map(item => (item.children?.length ? renderGroup(item) : renderItem(item)))}
          </nav>

          <p className="lf-section"><span className="lf-label">Manage</span></p>
          <nav className="lf-nav" aria-label="Manage">
            {secondaryItems.map(item => renderItem(item))}
          </nav>
        </div>

        <div className="lf-footer">
          <div className="lf-status" {...tooltipProps(`Workspace online · ${statusText}`)} tabIndex={rail ? 0 : undefined}>
            <span className="lf-item-icon"><span className="lf-status-dot" aria-hidden="true" /></span>
            <span className="lf-label">
              <span className="lf-status-title">Workspace online</span>
              <span className="lf-status-meta">{statusText}</span>
            </span>
          </div>
          {renderItem({ id: 'settings', icon: Settings, label: 'Settings' })}
        </div>
      </aside>

      {rail && (
        <RailPopover
          popover={popover}
          activeTab={activeTab}
          onSelect={select}
          onMenuEnter={cancelClose}
          onMenuLeave={closeSoon}
          onClose={closePopover}
        />
      )}
    </>
  );
}
