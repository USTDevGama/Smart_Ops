import { useState } from 'react';
import { Alert, Button, Input, Select, Spinner, Table } from '@/components/ui';
import { useApi, type SessionOut, type SessionStatus } from '../api';
import { ReportPanel } from '../components/ReportPanel';
import { StatusBadge, shortDate } from '../components/StatusBadge';
import { Transcript } from '../components/Transcript';
import { endReasonText } from '../hooks/chatController';
import { useAsync } from '../hooks/useAsync';

export function ReviewPage() {
  const api = useApi();
  const [trainee, setTrainee] = useState('');
  const [status, setStatus] = useState<'' | SessionStatus>('');
  const [openId, setOpenId] = useState<string>();

  const sessions = useAsync(
    () =>
      api.listSessions({ status: status || undefined, traineeRef: trainee.trim() || undefined }),
    [trainee, status],
  );

  return (
    <div className="stack">
      <h1>Review chats</h1>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <Input label="Trainee name" value={trainee} onChange={(e) => setTrainee(e.target.value)} />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | SessionStatus)}
        >
          <option value="">Any</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
        </Select>
      </div>

      {sessions.loading && <Spinner />}
      {sessions.error && <Alert kind="error">{sessions.error}</Alert>}
      {sessions.data && (
        <Table<SessionOut>
          rows={sessions.data}
          rowKey={(s) => s.id}
          empty="No chats match."
          columns={[
            { key: 'started', header: 'Started', render: (s) => shortDate(s.started_at) },
            { key: 'trainee', header: 'Trainee', render: (s) => s.trainee_ref },
            {
              key: 'client',
              header: 'Client',
              render: (s) => `${s.persona.key} v${s.persona.version_no}`,
            },
            { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
            { key: 'msgs', header: 'Messages', render: (s) => `${s.turns_used} of ${s.max_turns}` },
            { key: 'mood', header: 'Mood', render: (s) => `Level ${s.level}` },
            {
              key: 'why',
              header: 'Ended because',
              render: (s) => (s.status === 'ended' ? endReasonText(s.end_reason) : ''),
            },
            {
              key: 'open',
              header: '',
              render: (s) => (
                <Button variant="secondary" compact onClick={() => setOpenId(s.id)}>
                  Open
                </Button>
              ),
            },
          ]}
        />
      )}

      {openId && <SessionView key={openId} id={openId} onClose={() => setOpenId(undefined)} />}
    </div>
  );
}

function SessionView({ id, onClose }: { id: string; onClose: () => void }) {
  const api = useApi();
  const session = useAsync(() => api.getSession(id), [id]);
  const s = session.data;
  return (
    <section className="stack" aria-label="Chat detail">
      <div className="row-between">
        <h2>{s ? `${s.trainee_ref} with ${s.persona.key}` : 'Chat'}</h2>
        <Button variant="secondary" compact onClick={onClose}>
          Close
        </Button>
      </div>
      {session.loading && <Spinner />}
      {session.error && <Alert kind="error">{session.error}</Alert>}
      {s && (
        <>
          <div className="row">
            <StatusBadge status={s.status} />
            {s.status === 'ended' && <span>{endReasonText(s.end_reason)}</span>}
          </div>
          <Transcript turns={s.turns} showEvaluation />
          {s.status === 'ended' && <ReportPanel sessionId={s.id} isAdmin ensure={false} />}
        </>
      )}
    </section>
  );
}
