import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { apiService } from '../../services/api';

// http(s) links in message text. Trailing punctuation from the sentence isn't part of the link.
const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;
const TRAILING = /[.,;:!?)\]}'"»”’]+$/;

const trimUrl = (raw) => {
  let url = raw.replace(TRAILING, '');
  // Keep a closing bracket that belongs to the URL, as in Wikipedia links.
  const opens = (url.match(/\(/g) || []).length;
  const closes = (url.match(/\)/g) || []).length;
  if (opens > closes && raw.length > url.length && raw[url.length] === ')') url += ')';
  return url;
};

/** Every link in the text, in order, as { url, start, end }. */
const findLinks = (text) => {
  if (typeof text !== 'string') return [];
  const links = [];
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0]);
    try { new URL(url); } catch { continue; }
    links.push({ url, start: match.index, end: match.index + url.length });
  }
  return links;
};

/** Message text with its links made clickable. */
export function LinkifiedText({ text, inverted = false }) {
  const links = findLinks(text);
  if (!links.length) return text;
  const parts = [];
  let cursor = 0;
  links.forEach(({ url, start, end }) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <a
        key={start}
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={`underline underline-offset-2 ${inverted ? 'text-white decoration-white/50 hover:decoration-white' : 'text-sky-700 decoration-sky-700/40 hover:decoration-sky-700'}`}
      >
        {url}
      </a>,
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

const PreviewImage = ({ src }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <div className="aspect-[1.91/1] w-full overflow-hidden bg-slate-100">
      <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
    </div>
  );
};

const SiteIcon = ({ src }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Globe size={12} aria-hidden="true" className="shrink-0" />;
  return <img src={src} alt="" width="14" height="14" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-3.5 w-3.5 shrink-0 rounded-sm object-contain" />;
};

/**
 * A rich preview card (image, site, title, description) for the first link in a message.
 * Renders nothing while loading, or when the page has no preview.
 * @param {{ text: string, inverted?: boolean }} props  inverted: drawn inside a dark (sent) bubble.
 */
export default function LinkPreview({ text, inverted = false }) {
  const url = findLinks(text)[0]?.url || null;
  const [result, setResult] = useState({ url: null, preview: null });

  useEffect(() => {
    if (!url) return undefined;
    let cancelled = false;
    apiService.getLinkPreview(url).then((preview) => {
      if (!cancelled) setResult({ url, preview });
    });
    return () => { cancelled = true; };
  }, [url]);

  const preview = result.url === url ? result.preview : null;
  if (!preview || (!preview.title && !preview.image)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`link-preview-card mt-2.5 block w-[min(320px,100%)] overflow-hidden rounded-xl border no-underline transition-colors ${inverted
        ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
        : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'}`}
    >
      <PreviewImage src={preview.image} />
      <div className="space-y-1 px-3 py-2.5">
        <p className={`m-0 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${inverted ? 'text-white/60' : 'text-slate-500'}`}>
          <SiteIcon src={preview.favicon} />
          <span className="truncate">{preview.site_name || preview.domain}</span>
        </p>
        {preview.title && (
          <p className="m-0 line-clamp-2 text-[13.5px] font-semibold leading-snug [overflow-wrap:anywhere]">{preview.title}</p>
        )}
        {preview.description && (
          <p className={`m-0 line-clamp-2 text-[12.5px] leading-snug [overflow-wrap:anywhere] ${inverted ? 'text-white/70' : 'text-slate-500'}`}>{preview.description}</p>
        )}
      </div>
    </a>
  );
}
