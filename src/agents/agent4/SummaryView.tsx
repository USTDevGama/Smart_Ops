import type { RunStatus, Summary } from './api';
import styles from './SummaryView.module.css';

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

/** The trainee's result: one block of text written by the agent. Nothing here recomputes it. */
export function ResultsBlock({ summary }: { summary: Summary }) {
  return (
    <section className={styles.card} aria-labelledby="report-heading">
      <div className={styles.sectionHead}>
        <h2 id="report-heading">Assessment report</h2>
        <StatusBadge status={summary.status} />
      </div>
      <pre className={styles.report}>{summary.report}</pre>
    </section>
  );
}
