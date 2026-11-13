import { Tag, type TagKind } from '@/components/ui';

const MAP: Record<string, { kind: TagKind; label: string }> = {
  pending_review: { kind: 'warning', label: 'Pending review' },
  finalizing: { kind: 'info', label: 'Finalizing' },
  active: { kind: 'info', label: 'Active' },
  accepted: { kind: 'success', label: 'Accepted' },
  rejected: { kind: 'error', label: 'Rejected' },
  failed: { kind: 'error', label: 'Failed' },
  ingesting: { kind: 'info', label: 'Ingesting' },
  ready: { kind: 'success', label: 'Ready' },
};

export function StatusBadge({ status }: { status: string }) {
  const m = MAP[status] ?? { kind: 'neutral' as TagKind, label: toLabel(status) };
  return <Tag kind={m.kind}>{m.label}</Tag>;
}

function toLabel(s: string) {
  const t = s.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
