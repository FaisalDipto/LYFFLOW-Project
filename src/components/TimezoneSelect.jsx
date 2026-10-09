import { useMemo } from 'react';
import { isListedTimezone, timezoneGroups } from '../utils/timezones';

// Native select of every IANA timezone, grouped by region ("Asia" → "Dhaka (UTC+06:00)").
// Native keeps keyboard type-ahead and the phone picker. A saved value the browser
// doesn't list (an alias such as "Asia/Kolkata" where it says "Asia/Calcutta") is
// kept as its own option so it still shows and isn't silently changed.
export default function TimezoneSelect({ value, onChange, ...props }) {
  const groups = useMemo(() => timezoneGroups(), []);
  const unlisted = value && !isListedTimezone(value);

  return (
    <select value={value} onChange={event => onChange(event.target.value)} {...props}>
      {unlisted && <option value={value}>{value}</option>}
      {groups.map(group => (
        <optgroup key={group.region} label={group.region}>
          {group.zones.map(zone => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
