import { useEffect, useRef } from 'react';
import { canRunRichMotion } from './motionPreference';

/**
 * Subtle 3D tilt that follows the cursor within the element's bounds.
 * Desktop/fine-pointer only; no-ops on touch or when reduced motion is on.
 */
export function useTilt({ max = 8, scale = 1.02 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canRunRichMotion()) return undefined;

    let frame = null;

    const apply = (x, y) => {
      const rect = el.getBoundingClientRect();
      const px = (x - rect.left) / rect.width - 0.5;
      const py = (y - rect.top) / rect.height - 0.5;
      const rotateY = px * max * 2;
      const rotateX = -py * max * 2;
      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
    };

    const handleMove = (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        apply(e.clientX, e.clientY);
      });
    };

    const handleLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      el.style.transform = '';
    };

    el.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [max, scale]);

  return ref;
}
