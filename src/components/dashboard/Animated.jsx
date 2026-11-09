import { useEffect, useRef, useState } from 'react';
import { useInViewOnce } from '../../hooks/useInViewOnce';

// Dashboard motion: figures count up from 0, bars grow and charts draw the first time
// they scroll into view. Later changes (another period, a refresh) show straight away.

const COUNT_MS = 1100;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

// Numbers inside already formatted text: "BDT 105,300", "24.3%", "6 h 40 min", "12 · 27.1%".
const NUMBER = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;

const scaleNumber = (token, progress) => {
  const grouped = token.includes(',');
  const [, decimals = ''] = token.replace(/,/g, '').split('.');
  const value = Number(token.replace(/,/g, '')) * progress;
  return value.toLocaleString('en-US', {
    useGrouping: grouped,
    minimumFractionDigits: decimals.length,
    maximumFractionDigits: decimals.length,
  });
};

/**
 * Formatted text whose numbers count up from 0 the first time it is seen. Ends on the
 * exact original text; text with no plain digits (e.g. "—") is shown as it is.
 * @param {{ text: React.ReactNode }} props
 */
export function CountUp({ text }) {
  const ref = useRef(null);
  const { inView, animate } = useInViewOnce(ref);
  const isText = typeof text === 'string' || typeof text === 'number';
  const value = isText ? String(text) : '';
  const countable = animate && isText && /\d/.test(value);
  const [progress, setProgress] = useState(countable ? 0 : 1);

  useEffect(() => {
    if (!countable || !inView || progress >= 1) return undefined;
    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      setProgress(easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // Runs once, when first seen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countable, inView]);

  if (!isText) return text;
  const shown = progress >= 1 ? value : value.replace(NUMBER, token => scaleNumber(token, progress));
  // The final text is what screen readers get, without the counting.
  return (
    <span ref={ref}>
      <span aria-hidden={progress < 1 ? 'true' : undefined}>{shown}</span>
      {progress < 1 && <span className="sr-only">{value}</span>}
    </span>
  );
}

/**
 * A bar fill that grows from 0 to `width` (a CSS width such as "42%") when first seen.
 * Other props go to the fill element.
 */
export function GrowBar({ width, style, className = '', ...rest }) {
  const ref = useRef(null);
  const { inView, animate } = useInViewOnce(ref, { threshold: 0.1 });
  return (
    <div
      ref={ref}
      {...rest}
      className={className}
      style={{
        ...style,
        width: inView ? width : '0%',
        transition: animate ? 'width 900ms cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
      }}
    />
  );
}

/**
 * Mounts its children only once they scroll into view, so a chart's own entry animation
 * plays where it can be seen. Keeps the space (className sets the size) until then.
 */
export function RevealOnView({ className = '', children }) {
  const ref = useRef(null);
  const { inView } = useInViewOnce(ref, { threshold: 0.15 });
  return <div ref={ref} className={className}>{inView ? children : null}</div>;
}
