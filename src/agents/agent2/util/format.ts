export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const pct = (c: number) => `${Math.round(c * 100)}%`;

/** "subtle_harsh" -> "Subtle harsh". Flag names come from the admin or the agent and may use _ or -. */
export function flagTitle(name: string): string {
  const t = name.replace(/[_-]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Lookup key for matching an agent's flag name ("subtle_harsh") to the flags table ("subtle-harsh"). */
export const flagKey = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '_');

/** "R-02 <-> T-03" -> source "R-02" (the reviewer), trainee "T-03". Anything else is returned whole as the source. */
export function parseSubject(subject: string): { source: string; trainee: string | null } {
  const parts = subject.split('<->').map((p) => p.trim());
  if (parts.length === 2 && parts[0] && parts[1]) return { source: parts[0], trainee: parts[1] };
  return { source: subject.trim(), trainee: null };
}

/** Title of a run: the batch id from the agent output, or a placeholder while the backend has not given one yet. */
export const batchLabel = (batchId: string | null | undefined) =>
  batchId ? `Batch ${batchId}` : 'Batch ID not available yet';
