// GET /api/link-preview?url=<http(s) url>
// Reads a public web page's Open Graph / Twitter / HTML metadata so the inbox can show a
// rich preview card for links in messages. Browsers can't read other sites' pages (CORS),
// so this runs on Vercel next to the site (and in `vite dev` through the plugin in
// vite.config.js).
//
// Because it fetches whatever URL it is given, it only connects to public addresses: every
// DNS answer is checked at connect time (so a redirect or DNS rebinding can't reach a
// private, loopback or cloud-metadata address), redirects are followed by hand and checked
// the same way, and only the first part of an HTML response is read.

import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';
import process from 'node:process';

const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 6000;
// YouTube puts its meta tags ~780 KB into the page.
const MAX_HTML_BYTES = 1280 * 1024;
const USER_AGENT = 'Mozilla/5.0 (compatible; LyfflowLinkPreview/1.0; +https://www.lyfflow.com)';

// ---------------------------------------------------------------- address checks

const ipv4ToInt = (ip) => ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
const PRIVATE_V4 = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([base, bits]) => [ipv4ToInt(base), bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0]);

const isPrivateV4 = (ip) => {
  const value = ipv4ToInt(ip);
  return PRIVATE_V4.some(([base, mask]) => ((value & mask) >>> 0) === base);
};

const isPrivateAddress = (ip) => {
  if (net.isIPv4(ip)) return isPrivateV4(ip);
  if (!net.isIPv6(ip)) return true;
  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return lower === '::' || lower === '::1'
    || /^f[cd]/.test(lower) // unique local fc00::/7
    || /^fe[89ab]/.test(lower) // link local fe80::/10
    || /^ff/.test(lower) // multicast
    || lower.startsWith('64:ff9b:') // NAT64
    || lower.startsWith('2001:db8:'); // documentation
};

// Used as the socket's DNS lookup, so the address actually connected to is the one checked.
const safeLookup = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: options.family || 4 }];
    const blocked = list.find(entry => isPrivateAddress(entry.address));
    if (blocked || list.length === 0) {
      const err = new Error('Address not allowed');
      err.code = 'EBLOCKED';
      return callback(err);
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
};

const parsePublicUrl = (raw) => {
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return null;
  if (net.isIP(host) && isPrivateAddress(host)) return null;
  if (url.port && !['80', '443', '8080', '8443'].includes(url.port)) return null;
  url.hash = '';
  return url;
};

// ---------------------------------------------------------------- fetching

const fetchOnce = (url) => new Promise((resolve, reject) => {
  const client = url.protocol === 'https:' ? https : http;
  const request = client.get(url, {
    lookup: safeLookup,
    timeout: TIMEOUT_MS,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
      'Accept-Language': 'en,bn;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
    },
  }, (response) => {
    const status = response.statusCode || 0;
    if (status >= 300 && status < 400 && response.headers.location) {
      response.resume();
      resolve({ redirect: response.headers.location });
      return;
    }
    if (status < 200 || status >= 300) {
      response.resume();
      reject(Object.assign(new Error(`Upstream ${status}`), { code: 'EUPSTREAM' }));
      return;
    }
    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    if (contentType.startsWith('image/')) {
      response.resume();
      resolve({ image: true, contentType });
      return;
    }
    if (contentType && !contentType.includes('html')) {
      response.resume();
      reject(Object.assign(new Error('Not an HTML page'), { code: 'ENOTHTML' }));
      return;
    }

    const encoding = String(response.headers['content-encoding'] || '').toLowerCase();
    let stream = response;
    if (encoding === 'gzip' || encoding === 'x-gzip') stream = response.pipe(zlib.createGunzip());
    else if (encoding === 'deflate') stream = response.pipe(zlib.createInflate());
    else if (encoding === 'br') stream = response.pipe(zlib.createBrotliDecompress());

    const chunks = [];
    let size = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      response.destroy();
      const buffer = Buffer.concat(chunks);
      const charset = (contentType.match(/charset=([^;]+)/) || [])[1]?.trim();
      let html;
      try { html = new TextDecoder(charset || 'utf-8').decode(buffer); } catch { html = buffer.toString('utf8'); }
      resolve({ html });
    };
    stream.on('data', (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      // Metadata lives in <head>; stop once it's closed or the cap is reached.
      if (size >= MAX_HTML_BYTES || chunk.includes('</head>')) finish();
    });
    stream.on('end', finish);
    stream.on('error', (error) => { if (!done) { done = true; reject(error); } });
  });
  request.on('timeout', () => request.destroy(Object.assign(new Error('Timed out'), { code: 'ETIMEOUT' })));
  request.on('error', reject);
});

const fetchPage = async (startUrl) => {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const result = await fetchOnce(url);
    if (!result.redirect) return { ...result, finalUrl: url };
    const next = parsePublicUrl(new URL(result.redirect, url).toString());
    if (!next) throw Object.assign(new Error('Redirect not allowed'), { code: 'EBLOCKED' });
    url = next;
  }
  throw Object.assign(new Error('Too many redirects'), { code: 'EUPSTREAM' });
};

// ---------------------------------------------------------------- parsing

const decodeEntities = (text) => text
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

const clean = (value, max) => {
  if (!value) return null;
  const text = decodeEntities(String(value)).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

const readAttributes = (tag) => {
  const attributes = {};
  const pattern = /([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = pattern.exec(tag))) attributes[match[1].toLowerCase()] = match[3] ?? match[4] ?? match[5] ?? '';
  return attributes;
};

const absolute = (value, base) => {
  if (!value) return null;
  try {
    const url = new URL(decodeEntities(value.trim()), base);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch { return null; }
};

const parseMetadata = (html, pageUrl) => {
  const head = html.split(/<\/head>/i)[0];
  const meta = {};
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = readAttributes(tag);
    const key = (attributes.property || attributes.name || attributes.itemprop || '').toLowerCase();
    if (key && attributes.content !== undefined && !(key in meta)) meta[key] = attributes.content;
  }
  let icon = null;
  for (const [tag] of head.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = readAttributes(tag);
    const rel = (attributes.rel || '').toLowerCase();
    if (/\b(icon|apple-touch-icon)\b/.test(rel) && attributes.href) {
      icon = absolute(attributes.href, pageUrl);
      if (rel.includes('apple-touch-icon')) break;
    }
  }
  const titleTag = (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];

  const host = pageUrl.hostname.replace(/^www\./, '');
  return {
    url: pageUrl.toString(),
    title: clean(meta['og:title'] || meta['twitter:title'] || titleTag, 160),
    description: clean(meta['og:description'] || meta['twitter:description'] || meta.description, 300),
    image: absolute(meta['og:image:secure_url'] || meta['og:image'] || meta['og:image:url'] || meta['twitter:image'] || meta['twitter:image:src'], pageUrl),
    site_name: clean(meta['og:site_name'], 60) || host,
    domain: host,
    favicon: icon || `${pageUrl.origin}/favicon.ico`,
  };
};

// ---------------------------------------------------------------- handler

const send = (res, status, body, cacheSeconds) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheSeconds
    ? `public, max-age=3600, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`
    : 'no-store');
  res.end(JSON.stringify(body));
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  const requested = new URL(req.url, 'http://localhost').searchParams.get('url') || '';
  if (requested.length > 2048) return send(res, 400, { error: 'invalid_url' });
  const target = parsePublicUrl(requested.trim());
  if (!target) return send(res, 400, { error: 'invalid_url' });

  try {
    const page = await fetchPage(target);
    if (page.image) {
      const host = page.finalUrl.hostname.replace(/^www\./, '');
      return send(res, 200, { url: page.finalUrl.toString(), title: null, description: null, image: page.finalUrl.toString(), site_name: host, domain: host, favicon: null }, 86400);
    }
    const preview = parseMetadata(page.html, page.finalUrl);
    // Nothing worth a card: the client shows the plain link.
    if (!preview.title && !preview.description && !preview.image) return send(res, 404, { error: 'no_metadata' }, 3600);
    return send(res, 200, preview, 86400);
  } catch (error) {
    if (error.code === 'EBLOCKED') return send(res, 400, { error: 'invalid_url' });
    if (process.env.LINK_PREVIEW_DEBUG) console.error(error);
    return send(res, 404, { error: 'unavailable' }, 600);
  }
}
