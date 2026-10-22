// A connected page's platform. The API sends `fb` | `ig` (PageInfo.platform, default fb);
// comments and older code say `facebook` | `instagram`. Both normalise to the long form.
const PLATFORM_ALIASES = { fb: 'facebook', facebook: 'facebook', ig: 'instagram', instagram: 'instagram' };

/** @returns {'facebook'|'instagram'|string} */
export const normalizePlatform = (platform) => PLATFORM_ALIASES[String(platform || 'fb').toLowerCase()] || String(platform);

export const isInstagram = (platform) => normalizePlatform(platform) === 'instagram';

export const platformLabel = (platform) => (isInstagram(platform) ? 'Instagram' : 'Facebook');
