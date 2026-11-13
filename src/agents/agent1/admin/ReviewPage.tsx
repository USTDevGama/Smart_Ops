import { useCallback, useEffect, useState } from 'react';
import { useAgent1Api } from '../api';
import type {
  AdminCurriculumItem,
  Review,
  SessionReport,
  SessionRow,
  SessionStatus,
  Track,
} from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, percent, score } from '../lib/format';

const FILTERS: (SessionStatus | 'all')[] = ['all', 'pending_review', 'accepted', 'rejected'];
const REVIEWABLE: SessionStatus[] = ['pending_review', 'accepted', 'rejected'];

function toLabel(s: string) {
  const spaced = s.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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

  const selectedSession = sessions?.find((s) => s.session_id === selected) ?? null;
  const selectedCurriculum = selectedSession
    ? (curricula?.find((c) => c.curriculum_id === selectedSession.curriculum_id) ?? null)
    : null;

  function curriculumName(curriculumId: number) {
    return (
      curricula?.find((c) => c.curriculum_id === curriculumId)?.name ?? `Curriculum ${curriculumId}`
    );
  }

  return (
    <div className="review-page">
      <div className="card sessions-header">
        <div className="row">
          <h2 style={{ margin: 0 }}>HITL Review</h2>
          <span className="spacer" />
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as SessionStatus | 'all');
              setSelected(null);
            }}
          >
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {toLabel(f)}
              </option>
            ))}
          </select>
          <button onClick={refresh}>Refresh</button>
        </div>
        {error && <div className="alert error">{error}</div>}
        {sessions === null && <p className="muted">Loading…</p>}
        {sessions?.length === 0 && !error && <p className="muted">No sessions with this status.</p>}
        {sessions && sessions.length > 0 && (
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Candidate ID</th>
                <th>Curriculum</th>
                <th className="col-date">Date</th>
                <th className="col-score">Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.session_id} className={selected === s.session_id ? 'row-active' : ''}>
                  <td>
                    <button
                      className="row-btn candidate-id"
                      onClick={() => setSelected(s.session_id === selected ? null : s.session_id)}
                    >
                      {s.candidate_id.slice(0, 8)}
                    </button>
                  </td>
                  <td>{curriculumName(s.curriculum_id)}</td>
                  <td className="col-date muted small">{formatDate(s.started_at)}</td>
                  <td className="col-score muted small">
                    {s.overall_score != null ? score(s.overall_score) : '—'}
                  </td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && selectedSession ? (
        <div className="session-panels">
          <CurriculumPanel curriculum={selectedCurriculum} />
          <div>
            <SessionDetail
              key={selected}
              id={selected}
              curriculumName={curriculumName(selectedSession.curriculum_id)}
              onReviewed={refresh}
            />
          </div>
        </div>
      ) : (
        <div className="card center muted">
          Select a candidate ID to review its curriculum, transcript and report.
        </div>
      )}
    </div>
  );
}

function CurriculumPanel({ curriculum }: { curriculum: AdminCurriculumItem | null }) {
  const api = useAgent1Api();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [trackError, setTrackError] = useState('');
  const curriculumId = curriculum?.curriculum_id;

  useEffect(() => {
    if (curriculumId == null) return;
    setTracks(null);
    setTrackError('');
    api
      .getTracks(curriculumId)
      .then(setTracks)
      .catch((e: Error) => {
        setTrackError(e.message);
      });
  }, [api, curriculumId]);

  if (!curriculum) return <div className="card muted center">No curriculum linked.</div>;

  return (
    <div className="card">
      <h2>Curriculum</h2>
      <p>
        <strong>{curriculum.name}</strong>
      </p>
      <p className="muted small">
        Status: {toLabel(curriculum.status)} · Submitted {formatDate(curriculum.ingested_at)} ·{' '}
        {curriculum.sessions.length} session{curriculum.sessions.length === 1 ? '' : 's'}
      </p>
      {tracks === null && !trackError && <p className="muted">Loading tracks…</p>}
      {trackError && <div className="alert error">{trackError}</div>}
      {tracks && tracks.length === 0 && <p className="muted small">No tracks defined yet.</p>}
      {tracks && tracks.length > 0 && (
        <ul className="track-list">
          {tracks.map((t) => (
            <li key={t.track_key}>
              <strong>{t.track_name}</strong>
              {t.topics.length > 0 && (
                <ul className="topic-list">
                  {t.topics.map((tp) => (
                    <li key={tp.topic_id}>{tp.topic_name}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
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
  const gaps = topics
    .flatMap((t) => t.shaky.map((text) => ({ topic: t.topic, text })))
    .slice(0, 6);

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
                  ? 'Not covered'
                  : `${score(t.score)} · Level ${t.level_reached ?? '—'}`}
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
                    {g.score != null ? `${score(g.score)} / 5` : 'Not assessed'}
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
                {t.kind && t.kind !== 'answer' ? ` · ${toLabel(t.kind)}` : ''}
                {(t.reason || '').includes('asked_for_answer') && (
                  <span className="badge warn"> Asked for the answer</span>
                )}
                {(t.reason || '').includes('declined_answer_request') && (
                  <span className="badge info"> Declined to answer</span>
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
              {t.topic} · Level {t.level} · Score {t.score}/5
              {t.kind === 'integration' ? ' · Cross-track' : ''}
            </summary>
            <p className="muted small">Follow-ups asked: {t.follow_ups_asked}</p>
            <h3>Evidence</h3>
            <ul>
              {t.evidence.map((ev, i) => (
                <li key={i}>
                  &ldquo;{ev.quote}&rdquo;{' '}
                  <button className="link" onClick={() => jumpToTurn(ev.turn)}>
                    Turn {ev.turn}
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
        You are accepting or rejecting the agent&apos;s evaluation, not deciding on the candidate.
      </p>
      {review && (
        <div className="alert info">
          Latest: <strong>{toLabel(review.decision)}</strong> by {review.reviewer_id} on{' '}
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
        <p className="muted">This session is {toLabel(status)}, so it cannot be reviewed yet.</p>
      )}
    </div>
  );
}
