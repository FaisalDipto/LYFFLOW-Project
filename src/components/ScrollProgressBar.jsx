import { useEffect, useRef } from 'react';
import './ScrollProgressBar.css';

export default function ScrollProgressBar() {
  const fillRef = useRef(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return undefined;
    let ticking = false;

    const update = () => {
      ticking = false;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      el.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="scroll-progress-track" aria-hidden="true">
      <div ref={fillRef} className="scroll-progress-fill" />
    </div>
  );
}
