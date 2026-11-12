import { useState } from 'react';
import type { Decision, ReviewItem } from '../api/types';
import { pct } from '../util/format';
import { useToast } from './Toast';

/**
 * Decisions are text buttons with a pressed state, so the choice never relies on colour alone: accept = primary,
 * reject = error. The confidence bar is one accent fill; the number carries the meaning.
 * Which items need review is decided by the BACKEND, not here.
 */
const options: { value: Decision; label: string; active: string; idle: string }[] = [
  {
    value: 'accept',
    label: 'Accept',
    active: 'border-primary bg-primary text-white',
    idle: 'border-line text-heading hover:border-highlight-border hover:bg-highlight',
  },
  {
    value: 'reject',
    label: 'Reject',
    active: 'border-error bg-error text-white',
    idle: 'border-error-mid text-error hover:bg-error-faint',
  },
];

function ReviewCard({
  item,
  onDecide,
}: {
  item: ReviewItem;
  onDecide: (id: string, d: Decision) => Promise<void>;
}) {
  const [saving, setSaving] = useState<Decision | null>(null);
  const toast = useToast();

  async function pick(d: Decision) {
    setSaving(d);
    try {
      await onDecide(item.item_id, d);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(null);
    }
  }

  return (
    <li
      className={`rounded-md border bg-surface p-4 ${item.decision ? 'border-line' : 'border-accent'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4>{item.flag_name}</h4>
        <div className="flex items-center gap-2" title="Agent confidence">
          <span className="text-xs text-body">Confidence</span>
          <div
            className="h-1.5 w-24 overflow-hidden rounded-sm bg-neu-100"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={item.confidence}
            aria-label="Confidence"
          >
            <div className="h-full bg-accent" style={{ width: pct(item.confidence) }} />
          </div>
          <span className="w-10 font-mono text-xs font-medium tabular-nums text-heading">
            {pct(item.confidence)}
          </span>
        </div>
      </div>

      <p className="mt-3 font-mono text-xs text-body">{item.location}</p>
      {item.evidence && (
        <blockquote className="mt-2 rounded-sm border border-highlight-border bg-highlight px-3 py-2 text-sm italic text-heading">
          “{item.evidence}”
        </blockquote>
      )}
      <p className="mt-3 text-sm text-body">{item.explanation}</p>

      <div
        className="mt-4 flex flex-wrap gap-2"
        role="group"
        aria-label={`Decision for ${item.flag_name}`}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={item.decision === o.value}
            disabled={saving !== null}
            onClick={() => pick(o.value)}
            className={`h-8 rounded-sm border px-3 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-50 ${
              item.decision === o.value ? o.active : `bg-surface ${o.idle}`
            }`}
          >
            {saving === o.value ? 'Saving…' : o.label}
          </button>
        ))}
      </div>
    </li>
  );
}

export default function ReviewQueue({
  items,
  onDecide,
}: {
  items: ReviewItem[];
  onDecide: (id: string, d: Decision) => Promise<void>;
}) {
  const done = items.filter((i) => i.decision).length;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3>Review needed</h3>
        <span className="text-sm tabular-nums text-body">
          {done} of {items.length} reviewed
        </span>
      </div>
      <p className="mt-1 text-sm text-body">
        The agent was not confident about these flags. Accept or reject each one. The full output
        appears once all are reviewed.
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((i) => (
          <ReviewCard key={i.item_id} item={i} onDecide={onDecide} />
        ))}
      </ul>
    </div>
  );
}
