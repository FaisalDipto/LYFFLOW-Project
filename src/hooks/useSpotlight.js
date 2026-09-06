import { useEffect, useRef } from 'react';
import { canRunRichMotion } from './motionPreference';

/**
 * Tracks the cursor position within the ref'd element as CSS custom
 * properties (--spot-x, --spot-y, --spot-o) so a background layer can react
 * to it purely in CSS (e.g. a radial-gradient mask). Desktop/fine-pointer
 * only; no-ops on touch or reduced motion, leaving --spot-o at its CSS
 * fallback (0) so the reactive layer just stays invisible.
 */
export function useSpotlight() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canRunRichMotion()) return undefined;

    let frame = null;
    const handleMove = (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
        el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
        el.style.setProperty('--spot-o', '1');
      });
    };
    const handleLeave = () => {
      el.style.setProperty('--spot-o', '0');
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
