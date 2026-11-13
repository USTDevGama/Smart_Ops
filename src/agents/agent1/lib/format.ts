export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const score = (x: number | null | undefined): string =>
  x == null ? '—' : Number(x).toFixed(2);

export const percent = (x: number | null | undefined): string =>
  x == null ? '—' : `${Math.round(x * 100)}%`;

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
