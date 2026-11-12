import type { RunStatus } from '../api/types';
import { DotIcon, ErrorMarkIcon, WarningMarkIcon } from './Icon';

/**
 * Tag style from DESIGN_SPEC section 5.5: subtle background, mid border, heading-colour text, and an icon in the
 * strong colour so the status never relies on colour alone.
 */
const map: Record<RunStatus, { label: string; box: string; icon: JSX.Element }> = {
  queued: {
    label: 'Queued',
    box: 'border-neutral-mid bg-neutral-subtle',
    icon: <DotIcon className="text-neutral" />,
  },
  running: {
    label: 'Running',
    box: 'border-info-mid bg-info-subtle',
    icon: <DotIcon className="text-info" />,
  },
  needs_review: {
    label: 'Needs review',
    box: 'border-warning-mid bg-warning-subtle',
    icon: <WarningMarkIcon />,
  },
  completed: {
    label: 'Completed',
    box: 'border-success-mid bg-success-subtle',
    icon: <DotIcon className="text-success" />,
  },
  failed: { label: 'Failed', box: 'border-error-mid bg-error-subtle', icon: <ErrorMarkIcon /> },
};

export default function StatusBadge({ status }: { status: RunStatus }) {
  const s = map[status];
  return (
    <span
      className={`inline-flex min-h-5 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 text-xs font-medium text-heading ${s.box}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
}
