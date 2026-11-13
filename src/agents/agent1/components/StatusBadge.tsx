const TONES: Record<string, string> = {
  pending_review: 'warn',
  finalizing: 'info',
  active: 'info',
  accepted: 'good',
  rejected: 'bad',
  failed: 'bad',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${TONES[status] || ''}`}>{(status || '').replace('_', ' ')}</span>;
}
