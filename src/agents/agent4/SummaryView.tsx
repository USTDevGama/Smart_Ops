import type { RunStatus, ScoreRow, Summary } from './api';
import styles from './SummaryView.module.css';

// The scores run from 0 to 5 on the bars.
const SCALE_MAX = 5;
// A score at or above this is shown as a strong area (the same cut-off the agent uses).
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

/** One goal's score as a bar, with the gap threshold marked. Every goal is shown, gap or not. */
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

/** One of the agent's written texts (recommendations or the full report). Shown as it was
 * written, not recomputed. */
function TextSection({ id, heading, text }: { id: string; heading: string; text: string }) {
  return (
    <section className={styles.card} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <h2 id={id}>{heading}</h2>
      </div>
      <pre className={styles.report}>{text}</pre>
    </section>
  );
}

/** The trainee's result: every goal's score as a bar, then the agent's recommendations and full
 * report as text. All three come from the same checked data. */
export function ResultsBlock({ summary }: { summary: Summary }) {
  return (
    <div className={styles.results}>
      <div className={styles.sectionHead}>
        <h2>Trainee {summary.trainee_id}</h2>
        <StatusBadge status={summary.status} />
      </div>

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

      <TextSection id="recs-heading" heading="Recommendations" text={summary.recommendations} />
      <TextSection id="report-heading" heading="Assessment report" text={summary.report} />
    </div>
  );
}
