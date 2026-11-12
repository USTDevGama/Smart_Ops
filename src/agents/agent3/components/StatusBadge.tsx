import { Tag, type TagKind } from '@/components/ui';

const MAP: Record<string, { kind: TagKind; label: string }> = {
  queued: { kind: 'neutral', label: 'Queued' },
  extracting: { kind: 'info', label: 'Extracting' },
  ready: { kind: 'success', label: 'Ready' },
  failed: { kind: 'error', label: 'Failed' },
  draft: { kind: 'warning', label: 'Draft' },
  published: { kind: 'success', label: 'Published' },
  retired: { kind: 'neutral', label: 'Retired' },
  active: { kind: 'info', label: 'Active' },
  ended: { kind: 'neutral', label: 'Ended' },
};

/** Status is always shown as text; colour only reinforces it. */
export function StatusBadge({ status }: { status: string }) {
  const m = MAP[status] ?? { kind: 'neutral' as TagKind, label: status };
  return <Tag kind={m.kind}>{m.label}</Tag>;
}

export const isWorking = (status: string) => status === 'queued' || status === 'extracting';

export function shortDate(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}
