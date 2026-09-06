let reduceMotionQuery = null;
let finePointerQuery = null;

function getReduceMotionQuery() {
  if (typeof window === 'undefined') return null;
  if (!reduceMotionQuery) reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return reduceMotionQuery;
}

function getFinePointerQuery() {
  if (typeof window === 'undefined') return null;
  if (!finePointerQuery) finePointerQuery = window.matchMedia('(pointer: fine)');
  return finePointerQuery;
}

export function prefersReducedMotion() {
  return getReduceMotionQuery()?.matches ?? false;
}

export function hasFinePointer() {
  return getFinePointerQuery()?.matches ?? false;
}

// True only when it's safe to run mouse-driven / heavily animated DOM effects:
// a real pointer device, and the visitor hasn't asked for reduced motion.
export function canRunRichMotion() {
  return hasFinePointer() && !prefersReducedMotion();
}
