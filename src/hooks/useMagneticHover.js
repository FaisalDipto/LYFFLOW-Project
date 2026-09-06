import { useEffect, useRef } from 'react';
import { canRunRichMotion } from './motionPreference';

/**
 * Nudges the element a few px toward the cursor while hovered, snapping
 * back on leave. Desktop/fine-pointer only; no-ops on touch or reduced
 * motion.
 */
export function useMagneticHover(strength = 0.35) {
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
        const x = (e.clientX - (rect.left + rect.width / 2)) * strength;
        const y = (e.clientY - (rect.top + rect.height / 2)) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
    };

    const handleLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      el.style.transform = '';
    };

    el.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [strength]);

  return ref;
}
