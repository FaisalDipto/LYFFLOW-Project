import { isInstagram, platformLabel } from '../utils/platforms';

const FACEBOOK_PATH = 'M14 8V6.5c0-.83.67-1.5 1.5-1.5H18V1h-3c-3.31 0-6 2.69-6 6v1H6v4h3v11h5V12h3.5l.5-4h-4Z';
const INSTAGRAM_PATH = 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z';

/**
 * The logo of a page's platform (`fb` | `ig`, or `facebook` | `instagram`), in
 * currentColor. `labelled` names it for screen readers; otherwise it's decorative.
 */
export default function PlatformMark({ platform, className = '', style, labelled = false }) {
  const label = platformLabel(platform);
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="currentColor"
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? label : undefined}
      aria-hidden={labelled ? undefined : 'true'}
    >
      {labelled && <title>{label}</title>}
      <path d={isInstagram(platform) ? INSTAGRAM_PATH : FACEBOOK_PATH} />
    </svg>
  );
}
