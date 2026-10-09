// IANA timezone helpers for business and agent settings. The backend accepts any
// valid IANA name (aliases included) and defaults to "UTC".

// Used only if the browser can't list its timezones (Intl.supportedValuesOf is
// missing on older Safari).
const FALLBACK_TIMEZONES = [
  'UTC', 'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'America/Anchorage', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Mexico_City', 'America/New_York', 'America/Phoenix', 'America/Sao_Paulo',
  'America/Toronto', 'Asia/Bangkok', 'Asia/Dhaka', 'Asia/Dubai', 'Asia/Hong_Kong',
  'Asia/Jakarta', 'Asia/Karachi', 'Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Kuala_Lumpur',
  'Asia/Manila', 'Asia/Riyadh', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Melbourne', 'Australia/Sydney', 'Europe/Amsterdam',
  'Europe/Berlin', 'Europe/Istanbul', 'Europe/London', 'Europe/Madrid', 'Europe/Moscow',
  'Europe/Paris', 'Europe/Rome', 'Pacific/Auckland', 'Pacific/Honolulu',
];

export const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

// "GMT+06:00" style offset for a zone right now; empty if the browser can't tell.
const offsetLabel = (timeZone) => {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(new Date())
      .find(item => item.type === 'timeZoneName');
    return part ? part.value.replace('GMT', 'UTC').replace(/^UTC$/, 'UTC+00:00') : '';
  } catch {
    return '';
  }
};

let cachedGroups = null;

// [{ region: 'Asia', zones: [{ value: 'Asia/Dhaka', label: 'Dhaka (UTC+06:00)' }] }, ...]
// grouped by the first segment of the name, with UTC on its own at the top.
export const timezoneGroups = () => {
  if (cachedGroups) return cachedGroups;
  let names = FALLBACK_TIMEZONES;
  try {
    if (typeof Intl.supportedValuesOf === 'function') names = Intl.supportedValuesOf('timeZone');
  } catch {
    // keep the fallback list
  }
  const byRegion = new Map();
  names.forEach((name) => {
    if (name === 'UTC' || !name.includes('/')) return;
    const [region, ...rest] = name.split('/');
    const offset = offsetLabel(name);
    const city = rest.join(' / ').replace(/_/g, ' ');
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region).push({ value: name, label: offset ? `${city} (${offset})` : city });
  });
  cachedGroups = [
    { region: 'UTC', zones: [{ value: 'UTC', label: 'UTC (UTC+00:00)' }] },
    ...[...byRegion.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([region, zones]) => ({ region, zones: zones.sort((a, b) => a.label.localeCompare(b.label)) })),
  ];
  return cachedGroups;
};

export const isListedTimezone = (value) => timezoneGroups().some(group => group.zones.some(zone => zone.value === value));
