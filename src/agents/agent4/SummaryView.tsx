// The results page, following the trainee report design (trainee-report 1.html). Used by the trainee
// screen and by the evaluator's trainee detail. Every value comes from the summary.

import { useState, type ReactNode } from 'react';

import type { RunStatus, ScoreRow, Summary } from './api';
import {
  exerciseTotals,
  formatMinutes,
  groupScoreRows,
  notAssessedNote,
  outcomeLine,
  percentOfScale,
  recommendationCards,
  reportFileName,
  scoreStatus,
  signalsFor,
  SIGNAL_LABEL,
  STATUS_PILL_TEXT,
  STATUS_TEXT,
  type RecommendationCard as Card,
  type ScoreStatus,
} from './reportView';
import styles from './SummaryView.module.css';

/** Status is written out as text, so it never relies on colour alone. */
export function StatusBadge({ status }: { status: RunStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{STATUS_TEXT[status]}</span>;
}

const PILL_CLASS: Record<ScoreStatus, string> = {
  gap: `${styles.pill} ${styles.pillGap}`,
  met: `${styles.pill} ${styles.pillMet}`,
  not_assessed: `${styles.pill} ${styles.pillNa}`,
};

function Tile({
  label,
  value,
  alert = false,
  sub,
}: {
  label: string;
  value: string;
  alert?: boolean;
  sub?: ReactNode;
}) {
  return (
    <div className={alert ? `${styles.tile} ${styles.tileGap}` : styles.tile}>
      <div className={styles.tileLabel}>{label}</div>
      <div className={styles.tileValue}>{value}</div>
      {sub}
    </div>
  );
}

/** A small clock: the time it will take. Decorative; the words beside it say the same thing. */
function ClockIcon() {
  return (
    <svg
      className={styles.clock}
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  );
}

function ScoreLine({ row, threshold }: { row: ScoreRow; threshold: number }) {
  const status = scoreStatus(row.score, threshold);
  const isGap = status === 'gap';
  return (
    <div className={isGap ? `${styles.score} ${styles.scoreGap}` : styles.score}>
      <div className={styles.goal}>
        {row.goal} {row.label}
        <div className={styles.sigs}>
          {signalsFor(row.sources).map((signal) => (
            <span key={signal.code} className={`${styles.sig} ${styles[`sig${signal.code}`]}`}>
              {signal.label}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.track} aria-hidden="true">
        {row.score !== null && (
          <>
            <div className={styles.fill} style={{ width: percentOfScale(row.score) }} />
            <div className={styles.threshold} style={{ left: percentOfScale(threshold) }} />
          </>
        )}
      </div>
      <div className={styles.num}>{row.score === null ? '—' : row.score}</div>
      <div className={PILL_CLASS[status]}>{STATUS_PILL_TEXT[status]}</div>
    </div>
  );
}

function RecommendationCard({ card }: { card: Card }) {
  return (
    <article className={styles.exCard}>
      <header className={styles.exHead}>
        <h3 className={styles.exTitle}>{card.title}</h3>
        {card.minutes !== null && (
          <span className={styles.chip}>{formatMinutes(card.minutes)}</span>
        )}
      </header>
      <p className={styles.meta}>
        <strong>Linked goal:</strong> {card.goal}
      </p>
      <p className={styles.meta}>
        <strong>Why:</strong> {card.why}
      </p>
      <p className={styles.meta}>
        <strong>{card.outcomes.length === 1 ? 'Outcome:' : 'Outcomes:'}</strong>
      </p>
      {card.outcomes.length === 0 ? (
        <p className={styles.meta}>No outcome mapped yet (mapping not agreed).</p>
      ) : card.outcomes.length === 1 ? (
        <p className={styles.outcomeText}>{outcomeLine(card.outcomes[0])}</p>
      ) : (
        <ul className={styles.outcomes}>
          {card.outcomes.map((outcome) => (
            <li key={outcome.id}>{outcomeLine(outcome)}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** Opens a save dialog for a file the browser already holds. */
function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The whole results page. Every value comes from the summary. */
export function ResultsBlock({ summary }: { summary: Summary }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const threshold = summary.gap_threshold;
  const groups = groupScoreRows(summary.scores, threshold);
  const cards = recommendationCards(summary.gaps);

  async function download() {
    setBusy(true);
    setMessage('');
    try {
      const { buildReportPdf } = await import('./reportPdf');
      saveBlob(buildReportPdf(summary), reportFileName(summary.trainee_id));
      setMessage('Report downloaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The report could not be downloaded.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <div className={styles.eyebrow}>Skill assessment report</div>
          <h2 className={styles.title}>Trainee {summary.trainee_id}</h2>
        </div>
        <div className={styles.actions}>
          <span className={`${styles.status} ${styles[`status_${summary.status}`]}`}>
            {STATUS_TEXT[summary.status]}
          </span>
          <div className={styles.saved}>Report saved · run {summary.run_id.slice(0, 8)}</div>
          <button
            className={styles.download}
            type="button"
            onClick={() => void download()}
            disabled={busy}
          >
            {busy ? 'Making report…' : 'Download report'}
          </button>
          <p className={styles.statusLine} role="status" aria-live="polite">
            {message}
          </p>
        </div>
      </header>

      <div className={styles.tiles}>
        <Tile label="Goals assessed" value={`${summary.assessed_count} of ${summary.goal_count}`} />
        <Tile
          label="Skill gaps"
          value={String(summary.gaps.length)}
          alert={summary.gaps.length > 0}
        />
        <Tile
          label="Exercises"
          value={String(exerciseTotals(summary.gaps).count)}
          sub={
            <div className={styles.tileTime}>
              <ClockIcon />
              <span>{exerciseTotals(summary.gaps).time}</span>
            </div>
          }
        />
        <Tile label="Strong areas" value={String(summary.strong.length)} />
      </div>

      <section className={styles.section} aria-labelledby="rpt-overview">
        <h2 id="rpt-overview" className={styles.h2}>
          Overview
        </h2>
        <p className={styles.overview}>{summary.overview}</p>
      </section>

      <div className={styles.columns}>
        <section className={styles.section} aria-labelledby="rpt-scores">
          <h2 id="rpt-scores" className={styles.h2}>
            Scores by goal
          </h2>
          <div className={styles.sigLegend} aria-label="Signals">
            {(['A', 'B', 'C'] as const).map((code) => (
              <span key={code} className={`${styles.sig} ${styles[`sig${code}`]}`}>
                {SIGNAL_LABEL[code]}
              </span>
            ))}
          </div>
          <div className={styles.scroll} tabIndex={0} aria-label="Scores by goal">
            {groups.map((group) => (
              <div key={group.status}>
                <div className={styles.group}>{group.title}</div>
                {group.rows.map((row) => (
                  <ScoreLine key={row.goal} row={row} threshold={threshold} />
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="rpt-recs">
          <h2 id="rpt-recs" className={styles.h2}>
            Recommended exercises
          </h2>
          <div className={styles.scroll} tabIndex={0} aria-label="Recommended exercises">
            {cards.length === 0 ? (
              <p className={styles.muted}>No goal is a skill gap, so no exercise is needed.</p>
            ) : (
              cards.map((card) => <RecommendationCard key={card.key} card={card} />)
            )}
          </div>
        </section>
      </div>

      <section className={styles.section} aria-labelledby="rpt-strong">
        <h2 id="rpt-strong" className={styles.h2}>
          Strong areas
        </h2>
        {summary.strong.length === 0 ? (
          <p className={styles.muted}>No goal scores 4 or above yet.</p>
        ) : (
          <div className={styles.chips}>
            {summary.strong.map((row) => (
              <span key={row.goal} className={styles.strongChip}>
                {row.goal} {row.label} · {row.score}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="rpt-na">
        <h2 id="rpt-na" className={styles.h2}>
          Not assessed
        </h2>
        {summary.not_assessed.length === 0 ? (
          <p className={styles.muted}>Every goal was assessed.</p>
        ) : (
          <p className={styles.notice}>
            {notAssessedNote(summary.not_assessed)} This is not a low score.
          </p>
        )}
      </section>

      <footer className={styles.footer}>
        Generated from the trainee&apos;s assessment results. Draft, not reviewed: a reviewer must
        approve it before it is shared.
      </footer>
    </div>
  );
}
