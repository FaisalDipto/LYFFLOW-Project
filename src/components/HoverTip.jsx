import { useState } from 'react';
import { createPortal } from 'react-dom';
import './HoverTip.css';

/**
 * A small tooltip that shows at once on hover or keyboard focus. Rendered in a portal
 * with fixed position, so scrolling lists and clipped panels don't cut it off; it sits
 * above the element, or below when there's no room. Use it instead of `title`, which
 * shows late and not at all inside buttons in some browsers.
 */
export default function HoverTip({ text, children, className = '' }) {
  const [rect, setRect] = useState(null);
  if (!text) return <span className={className}>{children}</span>;
  const show = (event) => setRect(event.currentTarget.getBoundingClientRect());
  const hide = () => setRect(null);
  const below = rect && rect.top < 44;
  return (
    <>
      <span className={className} onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide} aria-label={text}>
        {children}
      </span>
      {rect && typeof document !== 'undefined' && createPortal(
        <span
          role="tooltip"
          className={`lf-hovertip ${below ? 'is-below' : ''}`}
          style={{
            left: Math.min(Math.max(rect.left + rect.width / 2, 12), window.innerWidth - 12),
            top: below ? rect.bottom + 6 : rect.top - 6,
          }}
        >
          {text}
        </span>,
        document.body,
      )}
    </>
  );
}
