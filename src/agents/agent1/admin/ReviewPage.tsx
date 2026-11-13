import { useCallback, useEffect, useState } from 'react';
import { useAgent1Api } from '../api';
import type {
  AdminCurriculumItem,
  Review,
  SessionReport,
  SessionRow,
  SessionStatus,
} from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, percent, score } from '../lib/format';

const FILTERS: (SessionStatus | 'all')[] = [
  'pending_review',
  'finalizing',
  'accepted',
  'rejected',
  'failed',
  'active',
  'all',
];
const REVIEWABLE: SessionStatus[] = ['pending_review', 'accepted', 'rejected'];

export function ReviewPage() {
  const [filter, setFilter] = useState<SessionStatus | 'all'>('pending_review');
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [curricula, setCurricula] = useState<AdminCurriculumItem[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const api = useAgent1Api();

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [sessionRows, curriculaRows] = await Promise.all([
        api.listSessions(filter, 100),
        api.getAdminCurricula(),
      ]);
      setSessions(sessionRows);
      setCurricula(curriculaRows);
    } catch (e) {
      setError((e as Error).message);
      setSessions([]);
    }
  }, [api, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const curriculumName = (curriculumId: number) =>
    curricula?.find((c) => c.curriculum_id === curriculumId)?.name ?? `Curriculum ${curriculumId}`;

  return (
    <div className="review">
      <aside className="card list">
        <h2>Curricula updated</h2>
        {curricula === null && <p className="muted">Loading…</p>}
        {curricula?.length === 0 && <p className="muted">No curriculum submitted yet.</p>}
        <ul className="curricula-list">
          {curricula?.map((c) => (
            <li key={c.curriculum_id}>
              <span className="item-top">
                <strong>{c.name}</strong>
                <span className="muted small">{c.status}</span>
              </span>
              <span className="muted small">
                Submitted {formatDate(c.ingested_at)} · {c.sessions.length} session
                {c.sessions.length === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>

        <h2>HITL review</h2>
        <div className="row">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as SessionStatus | 'all')}
          >
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f.replace('_', ' ')}
              </option>
            ))}
          </select>
          <button onClick={refresh}>Refresh</button>
        </div>
        {error && <div className="alert error">{error}</div>}
        {sessions === null && <p className="muted">Loading…</p>}
        {sessions?.length === 0 && !error && <p className="muted">No sessions with this status.</p>}
        <ul>
          {sessions?.map((s) => (
            <li key={s.session_id}>
              <button
                className={selected === s.session_id ? 'item active' : 'item'}
                onClick={() => setSelected(s.session_id)}
              >
                <span className="item-top">
                  <strong>{s.candidate_id.slice(0, 8)}</strong>
                  <StatusBadge status={s.status} />
                </span>
                <span className="muted small">Curriculum: {curriculumName(s.curriculum_id)}</span>
                <span className="muted small">
                  {formatDate(s.started_at)} · score {score(s.overall_score)} · confidence{' '}
                  {percent(s.assessment_confidence)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="detail">
        {selected ? (
          <SessionDetail
            key={selected}
            id={selected}
            curriculumName={
              sessions?.find((s) => s.session_id === selected)
                ? curriculumName(sessions.find((s) => s.session_id === selected)!.curriculum_id)
                : null
            }
            onReviewed={refresh}
          />
        ) : (
          <div className="card center muted">
            Select a session to review its curriculum, transcript and report.
          </div>
        )}
      </section>
    </div>
  );
}

function SessionDetail({
  id,
  curriculumName,
  onReviewed,
}: {
  id: string;
  curriculumName: string | null;
  onReviewed: () => void;
}) {
  const api = useAgent1Api();
  const [data, setData] = useState<SessionReport | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.getReport(id));
      setWaiting(false);
      setError('');
    } catch (e) {
      if ((e as { status?: number }).status === 404) setWaiting(true);
      else setError((e as Error).message);
    }
  }, [api, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [waiting, load]);

  if (error) return <div className="alert error">{error}</div>;
  if (waiting) {
    return (
      <div className="card muted">
        The report is still being prepared. This page checks again every few seconds.
      </div>
    );
  }
  if (!data) return <div className="card muted">Loading…</div>;

  const { report, review, status, goal_scores: goalScores } = data;
  const { overall, tracks, coverage, integration, topic_results: topics, turns } = report;

  function jumpToTurn(n: number) {
    const el = document.getElementById(`turn-${n}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1800);
  }

  const strengths = topics
    .flatMap((t) => t.solid.map((text) => ({ topic: t.topic, text })))
    .slice(0, 6);
  const gaps = topics.flatMap((t) => t.shaky.map((text) => ({ topic: t.topic, text }))).slice(0, 6);

  async function downloadJson() {
    setDownloading(true);
    try {
      const { downloadTranscriptPdf } = await import('../lib/pdf');
      downloadTranscriptPdf(report);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="detail-head">
          <h2>Candidate summary</h2>
          <StatusBadge status={status} />
          <button className="link" onClick={downloadJson} disabled={downloading}>
            {downloading ? 'Preparing…' : 'Download transcript (JSON)'}
          </button>
        </div>
        {curriculumName && (
          <p className="muted small">
            Curriculum: <strong>{curriculumName}</strong>
          </p>
        )}
        <div className="metrics">
          <Metric label="Overall score" value={`${score(overall.score)} / 5`} />
          <Metric label="Assessment confidence" value={percent(overall.assessment_confidence)} />
          <Metric
            label="Questions"
            value={String(topics.length + (coverage.unscored_questions?.length ?? 0))}
          />
          <Metric
            label="Tracks covered"
            value={`${coverage.tracks_covered.length}/${coverage.tracks_total}`}
          />
        </div>
        <p>{overall.summary}</p>
        {overall.confidence_reasons.length > 0 && (
          <p className="muted small">Confidence: {overall.confidence_reasons.join(' · ')}</p>
        )}

        <h3>Tracks</h3>
        <ul className="bars">
          {tracks.map((t) => (
            <li key={t.track_key}>
              <span>{t.name}</span>
              <span className="bar">
                <i style={{ width: `${((t.score || 0) / 5) * 100}%` }} />
              </span>
              <span className="muted small">
                {t.score == null
                  ? 'not covered'
                  : `${score(t.score)} · level ${t.level_reached ?? '—'}`}
              </span>
            </li>
          ))}
        </ul>
        {integration.attempted && (
          <p className="muted small">
            Cross-track questions: score {score(integration.score ?? null)}. {integration.note}
          </p>
        )}

        {goalScores && goalScores.length > 0 && (
          <>
            <h3>Goal scores</h3>
            <ul className="bars">
              {goalScores.map((g) => (
                <li key={g.goal_id}>
                  <span style={{ minWidth: 0 }} title={g.reasoning}>
                    <span
                      className="small"
                      style={{ color: 'var(--viva-muted)', display: 'block' }}
                    >
                      {g.goal_id}
                    </span>
                    {g.goal}
                  </span>
                  <span className="bar">
                    {g.score != null && <i style={{ width: `${(g.score / 5) * 100}%` }} />}
                  </span>
                  <span className="muted small">
                    {g.score != null ? `${score(g.score)} / 5` : 'not assessed'}
                    {g.relevant_topics.length > 0 && (
                      <>
                        {' '}
                        ·{' '}
                        <span title={g.relevant_topics.join(', ')}>
                          {g.relevant_topics.length} topic{g.relevant_topics.length > 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {(strengths.length > 0 || gaps.length > 0) && (
          <div className="cols">
            <div>
              <h3>Solid</h3>
              <ul>
                {strengths.map((s, i) => (
                  <li key={i}>
                    <strong>{s.topic}:</strong> {s.text}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Shaky or missing</h3>
              <ul>
                {gaps.map((s, i) => (
                  <li key={i}>
                    <strong>{s.topic}:</strong> {s.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Transcript</h2>
        <div className="log tall">
          {turns.map((t) => (
            <div id={`turn-${t.turn}`} key={t.turn} className={`bubble ${t.role}`}>
              <span className="who">
                {t.role === 'agent' ? 'Interviewer' : 'Candidate'} · #{t.turn}
                {t.kind && t.kind !== 'answer' ? ` · ${t.kind.replace('_', ' ')}` : ''}
                {(t.reason || '').includes('asked_for_answer') && (
                  <span className="badge warn"> asked for the answer</span>
                )}
                {(t.reason || '').includes('declined_answer_request') && (
                  <span className="badge info"> declined to answer</span>
                )}
              </span>
              {t.text || <em>(no response)</em>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Question results</h2>
        {topics.map((t) => (
          <details key={t.question_id}>
            <summary>
              {t.topic} · level {t.level} · score {t.score}/5
              {t.kind === 'integration' ? ' · cross-track' : ''}
            </summary>
            <p className="muted small">Follow-ups asked: {t.follow_ups_asked}</p>
            <h3>Evidence</h3>
            <ul>
              {t.evidence.map((ev, i) => (
                <li key={i}>
                  &ldquo;{ev.quote}&rdquo;{' '}
                  <button className="link" onClick={() => jumpToTurn(ev.turn)}>
                    turn {ev.turn}
                  </button>
                </li>
              ))}
            </ul>
            <h3>Expected answer</h3>
            <p>{t.expected_output.reference_answer}</p>
            <ul>
              {t.expected_output.key_ideas.map((k) => (
                <li key={k.id}>
                  {t.key_ideas_covered.includes(k.id) ? '✓' : '✗'} {k.text}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <DecisionForm
        id={id}
        status={status}
        review={review}
        onSaved={() => {
          load();
          onReviewed();
        }}
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <div className="muted small">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function DecisionForm({
  id,
  status,
  review,
  onSaved,
}: {
  id: string;
  status: SessionReport['status'];
  review: Review | null;
  onSaved: () => void;
}) {
  const api = useAgent1Api();
  const [reviewer, setReviewer] = useState(() => {
    try {
      return localStorage.getItem('viva.reviewerId') || '';
    } catch {
      return '';
    }
  });
  const [decision, setDecision] = useState<'accepted' | 'rejected'>('accepted');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!reviewer.trim()) return setError('Enter your reviewer ID.');
    if (decision === 'rejected' && !reason.trim())
      return setError('A reason is required when rejecting.');
    setBusy(true);
    try {
      await api.submitReview(id, {
        reviewer_id: reviewer.trim(),
        decision,
        reason: reason.trim() || null,
      });
      try {
        localStorage.setItem('viva.reviewerId', reviewer.trim());
      } catch {
        /* storage unavailable */
      }
      setReason('');
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Review decision</h2>
      <p className="muted small">
        You are accepting or rejecting the agent's evaluation, not deciding on the candidate.
      </p>
      {review && (
        <div className="alert info">
          Latest: <strong>{review.decision}</strong> by {review.reviewer_id} on{' '}
          {formatDate(review.decided_at)}
          {review.reason ? ` — ${review.reason}` : ''}
        </div>
      )}
      {REVIEWABLE.includes(status as (typeof REVIEWABLE)[number]) ? (
        <>
          <div className="field">
            <label htmlFor="rid">Reviewer ID</label>
            <input
              id="rid"
              type="text"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
            />
          </div>
          <div className="row">
            <label className="check">
              <input
                type="radio"
                checked={decision === 'accepted'}
                onChange={() => setDecision('accepted')}
              />{' '}
              Accept
            </label>
            <label className="check">
              <input
                type="radio"
                checked={decision === 'rejected'}
                onChange={() => setDecision('rejected')}
              />{' '}
              Reject
            </label>
          </div>
          <div className="field">
            <label htmlFor="reason">
              Reason{decision === 'rejected' ? ' (required)' : ' (optional)'}
            </label>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error && <div className="alert error">{error}</div>}
          <button className="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Submit decision'}
          </button>
        </>
      ) : (
        <p className="muted">
          This session is {status.replace('_', ' ')}, so it cannot be reviewed yet.
        </p>
      )}
    </div>
  );
}
