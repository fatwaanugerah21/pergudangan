/**
 * Shared chart colors and date formatting for dashboard charts.
 */

export const CHART_COLORS = {
  stock: ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe'],
  incoming: '#22c55e',
  outgoing: '#ef4444',
};

/** High-contrast palette for rice-type lines (distinct hues, easy to tell apart). */
export const RICE_TYPE_LINE_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#dc2626', // red
  '#ea580c', // orange
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#ca8a04', // amber
  '#db2777', // pink
  '#059669', // emerald
  '#4f46e5', // indigo
];

export function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const CARD_BASE_CLASS =
  'bg-white overflow-hidden shadow rounded-xl border border-gray-100 transition-all duration-200';
