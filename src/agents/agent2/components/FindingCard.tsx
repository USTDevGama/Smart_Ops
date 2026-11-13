import type { Finding, FindingStatus } from '../api/types';
import { flagKey, flagTitle, pct } from '../util/format';
import FlagFacts, { type FlagDescriptions } from './FlagFacts';
import { DotIcon, ErrorMarkIcon, WarningMarkIcon } from './Icon';

/** Status is icon + text + colour, never colour alone (same tag style as StatusBadge). */
const statusStyle: Record<FindingStatus, { label: string; box: string; icon: JSX.Element }> = {
  PENDING_REVIEW: {
    label: 'Awaiting review',
    box: 'border-warning-mid bg-warning-subtle',
    icon: <WarningMarkIcon />,
  },
  AUTO_ACCEPTED: {
    label: 'Auto-accepted',
    box: 'border-success-mid bg-success-subtle',
    icon: <DotIcon className="text-success" />,
  },
  ACCEPTED: {
    label: 'Accepted',
    box: 'border-success-mid bg-success-subtle',
    icon: <DotIcon className="text-success" />,
  },
  REJECTED: {
    label: 'Rejected',
    box: 'border-error-mid bg-error-subtle',
    icon: <ErrorMarkIcon />,
  },
};

export default function FindingCard({
  finding: f,
  descriptions,
}: {
  finding: Finding;
  descriptions: FlagDescriptions;
}) {
  const s = statusStyle[f.status];
  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h5 className="m-0 text-base font-medium text-heading">{flagTitle(f.flag)}</h5>
        <span
          className={`inline-flex min-h-5 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 text-xs font-medium text-heading ${s.box}`}
        >
          {s.icon}
          {s.label}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2" title="Agent confidence">
        <span className="text-xs text-body">Confidence</span>
        <div
          className="h-1.5 w-24 overflow-hidden rounded-sm bg-neu-100"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={f.confidence}
          aria-label={`Confidence for ${f.flag}`}
        >
          <div className="h-full bg-accent" style={{ width: pct(f.confidence) }} />
        </div>
        <span className="font-mono text-xs font-medium tabular-nums text-heading">
          {pct(f.confidence)}
        </span>
      </div>

      <FlagFacts
        flag={f.flag}
        subject={f.subject}
        explanation={f.explanation}
        description={descriptions[flagKey(f.flag)]}
      />
    </li>
  );
}
