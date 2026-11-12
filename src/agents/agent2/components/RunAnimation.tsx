import type { FlagProgress, Run } from '../api/types';
import { DotIcon, WarningMarkIcon } from './Icon';

/**
 * One chip per flag. State is shown with an icon and a hidden label as well as colour (DESIGN_SPEC section 7).
 * The checking chip uses the highlight treatment (section 2): highlight background + highlight border.
 */
function Chip({ f }: { f: FlagProgress }) {
  const base = 'flex items-center gap-2 rounded-sm border px-3 py-2 text-sm';
  if (f.state === 'checking')
    return (
      <li
        className={`${base} border-highlight-border bg-highlight font-medium text-heading`}
        aria-current="step"
      >
        <span
          className="bf-spin h-3 w-3 shrink-0 rounded-full border-2 border-accent border-t-transparent"
          aria-hidden
        />
        {f.flag_name}
        <span className="sr-only">(checking)</span>
      </li>
    );
  if (f.state === 'checked')
    return (
      <li className={`${base} border-line bg-surface text-heading`}>
        {f.raised ? <WarningMarkIcon /> : <DotIcon className="text-success" />}
        {f.flag_name}
        <span className="text-xs text-body">{f.raised ? 'Finding raised' : 'Clear'}</span>
      </li>
    );
  return (
    <li className={`${base} border-line bg-neu-50 text-body`}>
      <span className="h-3 w-3 shrink-0 rounded-full border-2 border-neu-300" aria-hidden />
      {f.flag_name}
      <span className="sr-only">(waiting)</span>
    </li>
  );
}

/** Shown on the right tile while the agent runs. Purely driven by Run.progress from GET /runs/{id}. */
export default function RunAnimation({ run }: { run: Run }) {
  const { checked, total, flags } = run.progress;
  const pct = total ? Math.round((checked / total) * 100) : 0;
  const current = flags.find((f) => f.state === 'checking');

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3>{run.status === 'queued' ? 'Queued…' : 'Agent is checking your input'}</h3>
        <span className="text-sm tabular-nums text-body">
          {checked} / {total} flags
        </span>
      </div>
      <p className="mt-1 h-5 text-sm text-body" aria-live="polite">
        {current
          ? `Checking: ${current.flag_name}`
          : run.status === 'queued'
            ? 'Waiting for the agent to start'
            : 'Wrapping up…'}
      </p>

      <div
        className="mt-3 h-2 overflow-hidden rounded-sm bg-neu-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Flags checked"
      >
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {flags.map((f) => (
          <Chip key={f.flag_id} f={f} />
        ))}
      </ul>
    </div>
  );
}
