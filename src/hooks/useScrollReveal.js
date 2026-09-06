import { useRef } from 'react';
import { useScrollProgress } from './useScrollProgress';

/**
 * Scroll-scrubbed entrance: scales/lifts/fades an element in as it travels
 * through roughly the first `span` fraction of its transit across the
 * viewport, then holds steady. Unlike a one-shot IntersectionObserver
 * toggle, this stays linked to scroll position on the way in (a light
 * scroll-scrub), while never re-hiding an element the visitor has already
 * scrolled past.
 *
 * Usage: const ref = useScrollReveal(); <div ref={ref} className="scroll-reveal">
 * (the base hidden/transformed state lives in the `.scroll-reveal` CSS class
 * so there's no flash-of-unstyled-content before the first frame runs).
 */
export function useScrollReveal({ span = 0.35, fromScale = 0.94, lift = 24 } = {}) {
  const ref = useRef(null);
  useScrollProgress(ref, (p) => {
    const el = ref.current;
    if (!el) return;
    const enter = Math.min(1, p / span);
    el.style.opacity = String(enter);
    el.style.transform = `translate3d(0, ${(1 - enter) * lift}px, 0) scale(${fromScale + enter * (1 - fromScale)})`;
  });
  return ref;
}
