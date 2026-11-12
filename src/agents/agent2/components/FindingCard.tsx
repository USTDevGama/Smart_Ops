import type { Finding, FindingStatus } from '../api/types';
import { pct } from '../util/format';
import { DotIcon, ErrorMarkIcon, WarningMarkIcon } from './Icon';

/** Status is icon + text + colour, never colour alone (same tag style as StatusBadge). */
const statusStyle: Record<FindingStatus, { label: string; box: string; icon: JSX.Element }> = {
  pending_review: {
    label: 'Awaiting review',
    box: 'border-warning-mid bg-warning-subtle',
    icon: <WarningMarkIcon />,
  },
  auto_accepted: {
    label: 'Auto-accepted',
    box: 'border-success-mid bg-success-subtle',
    icon: <DotIcon className="text-success" />,
  },
  accepted: {
    label: 'Accepted',
    box: 'border-success-mid bg-success-subtle',
    icon: <DotIcon className="text-success" />,
  },
  rejected: {
    label: 'Rejected',
    box: 'border-error-mid bg-error-subtle',
    icon: <ErrorMarkIcon />,
  },
  escalated: {
    label: 'Escalated',
    box: 'border-warning-mid bg-warning-subtle',
    icon: <WarningMarkIcon />,
  },
};

/** One plain sentence about who looked at the finding. */
function reviewText(f: Finding): string {
  if (f.status === 'pending_review') return 'Waiting for a person to review this finding.';
  if (!f.reviewed_by_human) return 'Not reviewed by a person: the agent was confident enough.';
  if (f.status === 'accepted') return 'Reviewed by a person, who accepted it.';
  if (f.status === 'rejected') return 'Reviewed by a person, who rejected it.';
  return 'Reviewed by a person, who escalated it.';
}

/** "subtle_harsh" -> "Subtle harsh". Flag names come from the admin or the backend and may use _ or -. */
export function flagTitle(name: string): string {
  const t = name.replace(/[_-]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function FindingCard({ finding: f }: { finding: Finding }) {
  const s = statusStyle[f.status];
  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h5 className="m-0 text-base font-medium text-heading">{flagTitle(f.flag_name)}</h5>
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
          aria-label={`Confidence for ${f.flag_name}`}
        >
          <div className="h-full bg-accent" style={{ width: pct(f.confidence) }} />
        </div>
        <span className="font-mono text-xs font-medium tabular-nums text-heading">
          {pct(f.confidence)}
        </span>
      </div>

      <p className="mt-3 text-sm text-heading">{f.explanation}</p>

      <dl className="mt-3 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-body">Sources</dt>
        <dd>
          {f.evidence_ids.length ? (
            <ul className="flex flex-wrap gap-1.5" aria-label={`Sources for ${f.flag_name}`}>
              {f.evidence_ids.map((id) => (
                <li
                  key={id}
                  className="rounded-sm border border-line bg-neu-50 px-2 font-mono text-xs text-heading"
                >
                  {id}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-body">None listed</span>
          )}
        </dd>
        {f.trainee_id && (
          <>
            <dt className="text-body">Trainee</dt>
            <dd className="font-mono text-xs text-heading">{f.trainee_id}</dd>
          </>
        )}
        <dt className="text-body">Review</dt>
        <dd className="text-heading">{reviewText(f)}</dd>
      </dl>

      {f.evidence && (
        <blockquote className="mt-3 rounded-sm border border-highlight-border bg-highlight px-3 py-2 text-sm italic text-heading">
          “{f.evidence}”
          {f.location && (
            <span className="mt-1 block font-mono text-xs not-italic text-body">{f.location}</span>
          )}
        </blockquote>
      )}
    </li>
  );
}
