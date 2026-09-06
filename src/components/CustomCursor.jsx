import { useEffect, useRef } from 'react';
import { canRunRichMotion } from '../hooks/motionPreference';
import './CustomCursor.css';

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input, textarea, select, .cursor-interactive';

export default function CustomCursor() {
  const dotRef = useRef(null);

  useEffect(() => {
    if (!canRunRichMotion()) return undefined;
    const el = dotRef.current;
    if (!el) return undefined;

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const rendered = { x: pos.x, y: pos.y };
    let scale = 1;
    let rafId = null;

    const loop = () => {
      // Lerp toward the real cursor position for a soft trailing feel
      // instead of snapping 1:1 to the mouse.
      rendered.x += (pos.x - rendered.x) * 0.2;
      rendered.y += (pos.y - rendered.y) * 0.2;
      el.style.transform = `translate3d(${rendered.x}px, ${rendered.y}px, 0) scale(${scale})`;
      rafId = requestAnimationFrame(loop);
    };

    const handleMove = (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      el.classList.add('is-visible');
    };
    const handleOver = (e) => {
      scale = e.target.closest(INTERACTIVE_SELECTOR) ? 1.8 : 1;
      el.classList.toggle('is-hovering', scale > 1);
    };
    const handleLeaveWindow = () => el.classList.remove('is-visible');

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseover', handleOver);
    document.addEventListener('mouseleave', handleLeaveWindow);
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseover', handleOver);
      document.removeEventListener('mouseleave', handleLeaveWindow);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <div ref={dotRef} className="custom-cursor" aria-hidden="true" />;
}
