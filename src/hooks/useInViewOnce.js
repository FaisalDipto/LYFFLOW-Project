import { useEffect, useState } from 'react';

const reducedMotion = () => typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * True once the element has scrolled into view (and stays true). With "reduce motion"
 * turned on, or no IntersectionObserver, it is true straight away so nothing animates.
 * @param {React.RefObject<Element>} ref
 * @returns {{ inView: boolean, animate: boolean }}  animate: false when motion is reduced.
 */
export function useInViewOnce(ref, { threshold = 0.2 } = {}) {
  const [animate] = useState(() => !reducedMotion() && typeof IntersectionObserver !== 'undefined');
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!animate || seen || !ref.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    }, { threshold });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [animate, ref, seen, threshold]);

  return { inView: !animate || seen, animate };
}
