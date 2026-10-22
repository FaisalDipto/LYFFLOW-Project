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

// One-hue blue ramp for magnitude (heatmaps), steps 100 -> 700. Near zero recedes
// toward the surface: light runs pale -> deep, dark runs deep -> pale.
const BLUE_RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'];

/** The ramp colour for `value` out of `max`, and whether text on it should be light. */
export function heatColor(value, max, isDark) {
  const ramp = isDark ? [...BLUE_RAMP].reverse() : BLUE_RAMP;
  if (!max || !value) return { background: isDark ? '#141414' : '#f1f5f9', lightText: false };
  const index = Math.min(ramp.length - 1, Math.round((value / max) * (ramp.length - 1)));
  // Light surface: the deeper half needs white text. Dark surface: the paler half needs dark text.
  const lightText = isDark ? index < ramp.length / 2 : index >= ramp.length / 2;
  return { background: ramp[index], lightText };
}
