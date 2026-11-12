import type { GapSummary, RunStatus, ScoreRow, Summary } from './api';
import styles from './SummaryView.module.css';

// The scores run from 0 to 5 on the bars.
const SCALE_MAX = 5;
// A score at or above this is shown as a strong area (the same rule as the Pod 4 screen).
const STRONG_FROM = 4;

export const STATUS_LABEL: Record<RunStatus, string> = {
  running: 'Running',
  pending_review: 'Pending review',
  failed: 'Failed',
  approved: 'Approved',
  rejected: 'Rejected',
};

/** Status is written out as text, so it never relies on colour alone. */
export function StatusBadge({ status }: { status: RunStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{STATUS_LABEL[status]}</span>;
}

function pct(value: number): string {
  return `${(value / SCALE_MAX) * 100}%`;
}

function gapLabel(row: ScoreRow, threshold: number): string {
  if (row.score === null) return 'Not assessed';
  if (row.score <= threshold) return 'Gap';
  if (row.score >= STRONG_FROM) return 'Strong';
  return '';
}

/** The results for one trainee: the same layout for trainee and evaluator. */
export function ResultsBlock({ summary }: { summary: Summary }) {
  const gaps = summary.gaps;
  const exercises = gaps.reduce((count, gap) => count + gap.exercises.length, 0);
  const averageGap =
    gaps.length === 0
      ? null
      : gaps.reduce((sum, gap) => sum + (summary.gap_threshold - gap.score), 0) / gaps.length;

  return (
    <div className={styles.results}>
      <div className={styles.kpis}>
        <Kpi label="Goals assessed" value={`${summary.assessed_count} of ${summary.goal_count}`} />
        <Kpi label="Open skill gaps" value={String(gaps.length)} />
        <Kpi
          label="Average gap"
          value={averageGap === null ? 'None' : `${averageGap.toFixed(1)} pts`}
        />
        <Kpi label="Exercises for gaps" value={String(exercises)} />
      </div>

      <div className={styles.columns}>
        <div className={styles.stack}>
          <section className={styles.card} aria-labelledby="gaps-heading">
            <div className={styles.sectionHead}>
              <h2 id="gaps-heading">Skill gaps</h2>
              <span className={styles.small}>Score out of {SCALE_MAX}</span>
            </div>
            {summary.scores.map((row) => (
              <ScoreRowView key={row.goal} row={row} threshold={summary.gap_threshold} />
            ))}
            <div className={styles.legend}>
              <span className={styles.legendBar}>Score</span>
              <span className={styles.legendMark}>Gap threshold {summary.gap_threshold}</span>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="recs-heading">
            <div className={styles.sectionHead}>
              <h2 id="recs-heading">Recommendations</h2>
              <span className={styles.small}>{exercises} exercises</span>
            </div>
            {gaps.length === 0 ? (
              <p>No exercise is needed. No goal is at or below the gap threshold.</p>
            ) : (
              gaps.map((gap) => <Recommendation key={gap.goal} gap={gap} />)
            )}
          </section>
        </div>

        <section className={styles.card} aria-labelledby="report-heading">
          <div className={styles.sectionHead}>
            <h2 id="report-heading">Assessment report</h2>
            <StatusBadge status={summary.status} />
          </div>
          <p className={styles.meta}>
            Run {summary.run_id}. Assessed {summary.assessed_count} of {summary.goal_count} goals.
          </p>

          <h3>Areas to work on</h3>
          {gaps.length === 0 ? (
            <p>No goal is at or below the gap threshold.</p>
          ) : (
            <ul className={styles.list}>
              {gaps.map((gap) => (
                <li key={gap.goal}>
                  {gap.goal} {gap.label}: score {gap.score}, {gap.severity}
                </li>
              ))}
            </ul>
          )}

          <h3>Strong areas</h3>
          {summary.strong.length === 0 ? (
            <p>No goal scores {STRONG_FROM} or above yet.</p>
          ) : (
            <ul className={styles.list}>
              {summary.strong.map((row) => (
                <li key={row.goal}>
                  {row.goal} {row.label}: {row.score}
                </li>
              ))}
            </ul>
          )}

          {summary.not_assessed.length > 0 && (
            <>
              <h3>Not assessed</h3>
              <p>{summary.not_assessed.map((row) => `${row.goal} ${row.label}`).join(', ')}</p>
            </>
          )}

        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
    </div>
  );
}

function ScoreRowView({ row, threshold }: { row: ScoreRow; threshold: number }) {
  const label = gapLabel(row, threshold);
  return (
    <div className={styles.scoreRow}>
      <div className={styles.goal}>
        {row.goal} {row.label}
        <div className={styles.small}>
          {row.sources.length ? row.sources.join('; ') : 'No evidence yet'}
        </div>
      </div>
      {row.score === null ? (
        <div className={styles.small}>Not assessed</div>
      ) : (
        <div
          className={styles.track}
          role="img"
          aria-label={`${row.goal} ${row.label}: score ${row.score} of ${SCALE_MAX}, gap threshold ${threshold}`}
        >
          <div className={styles.fill} style={{ width: pct(row.score) }} />
          <div className={styles.threshold} style={{ left: pct(threshold) }} />
        </div>
      )}
      <div className={styles.value}>
        <span className={styles.number}>{row.score ?? '-'}</span>
        <span className={label === 'Gap' ? styles.gapText : styles.small}>{label}</span>
      </div>
    </div>
  );
}

function Recommendation({ gap }: { gap: GapSummary }) {
  return (
    <div className={styles.rec}>
      <div className={styles.recTitle}>
        {gap.goal} {gap.label} (score {gap.score})
      </div>
      {gap.exercises.length === 0 ? (
        <p className={styles.small}>No approved exercise for this goal yet.</p>
      ) : (
        <ul className={styles.list}>
          {gap.exercises.map((exercise) => (
            <li key={exercise.id}>
              {exercise.title} <span className={styles.number}>{exercise.minutes} min</span>
              <span className={styles.small}> ({exercise.id})</span>
            </li>
          ))}
        </ul>
      )}
      {gap.outcomes.length > 0 && (
        <p className={styles.small}>
          Outcome: {gap.outcomes.map((o) => o.wording).join('; ')} ({gap.outcome_match} match)
        </p>
      )}
    </div>
  );
}
