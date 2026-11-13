import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgent1Api } from '../api';
import type { AdminCurriculumItem, SessionRow, SessionStatus } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, score } from '../lib/format';

const FILTERS: (SessionStatus | 'all')[] = ['all', 'pending_review', 'accepted', 'rejected'];

function toLabel(s: string) {
  const spaced = s.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function ReviewPage() {
  const [filter, setFilter] = useState<SessionStatus | 'all'>('pending_review');
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [curricula, setCurricula] = useState<AdminCurriculumItem[] | null>(null);
  const [error, setError] = useState('');
  const api = useAgent1Api();
  const navigate = useNavigate();

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
                <tr key={s.session_id}>
                  <td>
                    <button
                      className="row-btn candidate-id"
                      onClick={() =>
                        navigate(`session/${s.session_id}/review?cid=${s.curriculum_id}`)
                      }
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
    </div>
  );
}
