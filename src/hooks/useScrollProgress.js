import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './motionPreference';

// Shared scroll-progress driver: ONE passive scroll listener and ONE
// requestAnimationFrame loop for the whole page, no matter how many
// components call useScrollProgress. A shared IntersectionObserver (generous
// rootMargin) flags which registered elements are actually near the
// viewport; only those get per-frame math, so offscreen sections cost
// nothing while the loop is running, and the rAF loop itself is torn down
// whenever nothing is active.

const entries = new Map(); // el -> { onProgress, mode, active }
let io = null;
let rafId = null;
let scrollScheduled = false;

function computeProgress(mode, rect, viewportH) {
  if (mode === 'cover') {
    // For a tall "pin wrapper" whose sticky child fills the viewport:
    // 0 when the wrapper's top reaches the viewport top, 1 once it has
    // scrolled by (wrapper height - viewport height), i.e. right as the
    // sticky child is about to release.
    const scrollable = rect.height - viewportH;
    if (scrollable <= 0) return 0;
    return Math.min(1, Math.max(0, -rect.top / scrollable));
  }
  // 'enter' (default): 0 as the element's top just enters from the bottom
  // edge, 1 once it has fully exited past the top edge — a smooth ramp
  // across the element's full transit through the viewport.
  const total = viewportH + rect.height;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (viewportH - rect.top) / total));
}

function tick() {
  rafId = null;
  const viewportH = window.innerHeight;
  let anyActive = false;
  entries.forEach((entry, el) => {
    if (!entry.active) return;
    anyActive = true;
    const rect = el.getBoundingClientRect();
    entry.onProgress(computeProgress(entry.mode, rect, viewportH), rect);
  });
  if (anyActive) rafId = requestAnimationFrame(tick);
}

function scheduleTick() {
  if (rafId != null || scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    scrollScheduled = false;
    rafId = requestAnimationFrame(tick);
  });
}

function getObserver() {
  if (io) return io;
  io = new IntersectionObserver(
    (ioEntries) => {
      let anyActive = false;
      ioEntries.forEach((ioEntry) => {
        const entry = entries.get(ioEntry.target);
        if (!entry) return;
        entry.active = ioEntry.isIntersecting;
        entry.el.style.willChange = entry.active ? 'transform' : '';
        if (entry.active) anyActive = true;
      });
      if (anyActive) scheduleTick();
    },
    { rootMargin: '200px 0px' }
  );
  window.addEventListener('scroll', scheduleTick, { passive: true });
  window.addEventListener('resize', scheduleTick);
  return io;
}

export function registerScrollTarget(el, onProgress, mode) {
  if (!el || typeof IntersectionObserver === 'undefined') return () => {};
  const observer = getObserver();
  entries.set(el, { onProgress, mode, active: false, el });
  observer.observe(el);
  // Run once immediately so content isn't stuck at its initial state
  // before the first scroll/observer callback fires.
  const rect = el.getBoundingClientRect();
  onProgress(computeProgress(mode, rect, window.innerHeight), rect);

  return () => {
    observer.unobserve(el);
    entries.delete(el);
    el.style.willChange = '';
  };
}

/**
 * Tracks elRef's scroll-through progress (0..1) via the shared driver above
 * and calls onProgress every frame while it's near the viewport. No-ops
 * entirely when the visitor prefers reduced motion.
 *
 * elRef: a ref (created with useRef in the caller) attached to the tracked
 *        DOM node — declared by the caller so callbacks can safely close
 *        over it without a temporal-dead-zone self-reference.
 * mode: 'enter' (default) for normal-flow reveal/parallax elements,
 *       'cover' for a tall sticky-pin wrapper (see computeProgress).
 */
export function useScrollProgress(elRef, onProgress, { mode = 'enter', enabled = true } = {}) {
  const callbackRef = useRef(onProgress);
  useEffect(() => {
    callbackRef.current = onProgress;
  });

  useEffect(() => {
    if (!enabled || !elRef.current || prefersReducedMotion()) return undefined;
    return registerScrollTarget(elRef.current, (p, rect) => callbackRef.current(p, rect), mode);
  }, [enabled, mode, elRef]);
}
