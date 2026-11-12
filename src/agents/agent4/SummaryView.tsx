import { useRef } from 'react';

import type { GapSummary, RunStatus, ScoreRow, Summary } from './api';
import styles from './SummaryView.module.css';

// The scores run from 0 to 5 on the bars.
const SCALE_MAX = 5;

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

/** One goal's score as a bar against the gap threshold, with a Met / Gap pill. Every goal is
 * shown, whether it is a gap or not. Gap vs Met comes straight from score vs threshold, both real
 * numbers; no points are shown, since the threshold and the score can be equal. */
function ScoreRowView({ row, threshold }: { row: ScoreRow; threshold: number }) {
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
        {row.score === null ? null : row.score <= threshold ? (
          <span className={styles.pillGap}>Gap</span>
        ) : (
          <span className={styles.pillMet}>Met</span>
        )}
      </div>
    </div>
  );
}

/** One recommendation card: the exercise the agent picked for one gap, and why. No invented
 * fields: the approved library has only an id, a title and minutes, all type "exercise", and no
 * due dates, so none of those are shown here. */
function RecommendationCard({
  gap,
  exercise,
}: {
  gap: GapSummary;
  exercise: GapSummary['exercises'][number];
}) {
  return (
    <div className={styles.recCard}>
      <div className={styles.recAvatar}>{exercise.title.charAt(0).toUpperCase()}</div>
      <div className={styles.recBody}>
        <div className={styles.recTop}>
          <span className={styles.recTitle}>{exercise.title}</span>
          <span className={styles.tag}>Exercise</span>
        </div>
        <div className={styles.small}>
          {gap.goal} {gap.label} &middot; score {gap.score} &middot; {exercise.minutes} min
        </div>
        <p className={styles.small}>{gap.why}</p>
      </div>
    </div>
  );
}

/** One of the agent's written texts (the full report). Shown as it was written, not recomputed. */
function TextSection({
  id,
  heading,
  text,
  sectionRef,
}: {
  id: string;
  heading: string;
  text: string;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section ref={sectionRef} className={styles.card} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <h2 id={id}>{heading}</h2>
      </div>
      <pre className={styles.report}>{text}</pre>
    </section>
  );
}

/** A tile that jumps the page to one section below, instead of the person scrolling past the
 * others to find it. */
function NavTile({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.navTile} onClick={onClick}>
      <span className={styles.navLabel}>{label}</span>
      <span className={styles.navValue}>{value}</span>
    </button>
  );
}

/** The trainee's result: every goal's score as a bar, recommendation cards per gap, and the
 * agent's full report as text. All three come from the same checked data. Three tiles above the
 * sections jump straight to the one you click, instead of scrolling past the others. */
export function ResultsBlock({ summary }: { summary: Summary }) {
  const gapsRef = useRef<HTMLElement>(null);
  const recsRef = useRef<HTMLElement>(null);
  const reportRef = useRef<HTMLElement>(null);
  const exerciseCount = summary.gaps.reduce((n, g) => n + g.exercises.length, 0);

  function goTo(ref: React.RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className={styles.results}>
      <div className={styles.sectionHead}>
        <h2>Trainee {summary.trainee_id}</h2>
        <StatusBadge status={summary.status} />
      </div>

      <div className={styles.navStrip}>
        <NavTile
          label="Skill gaps"
          value={String(summary.gaps.length)}
          onClick={() => goTo(gapsRef)}
        />
        <NavTile
          label="Recommendations"
          value={String(exerciseCount)}
          onClick={() => goTo(recsRef)}
        />
        <NavTile label="Report" value="View" onClick={() => goTo(reportRef)} />
      </div>

      <div className={styles.columns}>
        <div className={styles.stack}>
          <section ref={gapsRef} className={styles.card} aria-labelledby="gaps-heading">
            <div className={styles.sectionHead}>
              <h2 id="gaps-heading">Skill gaps</h2>
              <span className={styles.small}>Current vs. target</span>
            </div>
            {summary.scores.map((row) => (
              <ScoreRowView key={row.goal} row={row} threshold={summary.gap_threshold} />
            ))}
            <div className={styles.legend}>
              <span className={styles.legendBar}>Current level</span>
              <span className={styles.legendMark}>
                Target (gap threshold {summary.gap_threshold})
              </span>
            </div>
          </section>

          <section ref={recsRef} className={styles.card} aria-labelledby="recs-heading">
            <div className={styles.sectionHead}>
              <h2 id="recs-heading">Recommendations</h2>
              <span className={styles.small}>{exerciseCount} exercises</span>
            </div>
            {summary.gaps.length === 0 ? (
              <p className={styles.small}>No goal is a skill gap, so no exercise is needed.</p>
            ) : (
              summary.gaps.map((gap) =>
                gap.exercises.length === 0 ? (
                  <p key={gap.goal} className={styles.small}>
                    {gap.goal} {gap.label}: no approved exercise for this goal yet.
                  </p>
                ) : (
                  gap.exercises.map((exercise) => (
                    <RecommendationCard key={exercise.id} gap={gap} exercise={exercise} />
                  ))
                ),
              )
            )}
          </section>
        </div>

        <TextSection
          id="report-heading"
          heading="Assessment report"
          text={summary.report}
          sectionRef={reportRef}
        />
      </div>
    </div>
  );
}
