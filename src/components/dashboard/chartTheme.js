// Chart colours for the dashboards. Categorical slots 1-3 (green, orange, blue) validate
// as a set in both modes; the dark column is the same hues stepped for the black surface.
export const CHART_THEME = {
  light: {
    series: ['#1baf7a', '#eb6834', '#2a78d6'],
    grid: '#e2e8f0',
    axis: '#64748b',
    cursor: 'rgba(15, 23, 42, 0.04)',
    meterTrack: '#c8eedd',
    warning: '#c98500',
    critical: '#e34948',
  },
  dark: {
    series: ['#199e70', '#d95926', '#3987e5'],
    grid: '#2a2a2a',
    axis: '#9b9b9b',
    cursor: 'rgba(255, 255, 255, 0.04)',
    meterTrack: '#0f3a2b',
    warning: '#c98500',
    critical: '#e66767',
  },
};

// One-hue blue ramp for magnitude (heatmaps), the same in both modes: fewer messages
// are pale, more messages are deep navy. The stops span a wide lightness range so the
// busiest cells stand well apart from quiet ones.
const HEAT_RAMP = ['#e6f0fc', '#b7d3f6', '#6da7ec', '#2a78d6', '#184f95', '#0b2f63', '#061c40'];

const hexToRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

/** The ramp colour for `value` out of `max`, and whether text on it should be light. */
export function heatColor(value, max, isDark) {
  if (!max || !value) return { background: isDark ? '#141414' : '#f1f5f9', lightText: false };
  const ramp = HEAT_RAMP;
  // A gentle curve keeps quiet hours light and makes the peaks jump to the deep end.
  const t = Math.pow(Math.min(1, Math.max(0, value / max)), 1.25);
  const pos = t * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(pos));
  const f = pos - i;
  const a = hexToRgb(ramp[i]);
  const b = hexToRgb(ramp[i + 1]);
  const [r, g, bl] = a.map((c, k) => Math.round(c + (b[k] - c) * f));
  // The deeper half needs white text.
  const lightText = t >= 0.5;
  return { background: `rgb(${r}, ${g}, ${bl})`, lightText };
}
