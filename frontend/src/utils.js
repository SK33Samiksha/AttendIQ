// Small helpers used by several pages.

// Today's date in the user's own time zone as YYYY-MM-DD.
// (toISOString() uses UTC, which gives yesterday's date in India before 5:30 am.)
export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// '2024-01-15' (or a longer date-time string) -> '15 Jan 2024'
export function formatDate(value) {
  const day = String(value || '').slice(0, 10);
  const parsed = new Date(`${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value || '—';
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Colour class for an attendance percentage: green / amber / red
export function pctClass(p) {
  if (p >= 75) return 'high';
  if (p >= 50) return 'mid';
  return 'low';
}
