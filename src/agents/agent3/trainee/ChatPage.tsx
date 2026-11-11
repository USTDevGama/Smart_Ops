import { useState } from 'react';
import { Alert, Button, Card, Select, Spinner, type AlertKind } from '@/components/ui';
import { ApiError, useApi, type SessionDetail } from '../api';
import { shortDate } from '../components/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { ChatRoom } from './ChatRoom';

/** Start view: pick a character and a resume, or reopen an earlier chat. Room view: the chat itself. */
export function ChatPage() {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [flash, setFlash] = useState<{ kind: AlertKind; text: string }>();

  if (session) {
    return (
      <ChatRoom
        key={session.id}
        initial={session}
        flash={flash}
        onFlash={setFlash}
        onLeave={() => {
          setSession(null);
          setFlash(undefined);
        }}
      />
    );
  }
  return <StartView onOpen={setSession} />;
}

function StartView({ onOpen }: { onOpen: (s: SessionDetail) => void }) {
  const api = useApi();
  const personas = useAsync(() => api.listPersonas(), []);
  const profiles = useAsync(() => api.listProfiles(), []);
  const sessions = useAsync(() => api.listSessions(), []);
  const [personaKey, setPersonaKey] = useState('');
  const [profileId, setProfileId] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string>();
  const [earlierId, setEarlierId] = useState('');

  const ready = (profiles.data ?? []).filter((p) => p.status === 'ready');
  const chosenPersona = personaKey || personas.data?.[0]?.key || '';
  const chosenProfile = profileId || ready[0]?.id || '';
  const loading = personas.loading || profiles.loading;

  async function open(fn: () => Promise<SessionDetail>, setBusy?: (b: boolean) => void) {
    setError(undefined);
    setBusy?.(true);
    try {
      onOpen(await fn());
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : 'Could not open the chat.');
      setBusy?.(false);
    }
  }

  return (
    <div className="stack">
      <h1>Chat with the client</h1>
      {loading && <Spinner />}
      {personas.error && <Alert kind="error">{personas.error}</Alert>}
      {!loading && personas.data?.length === 0 && (
        <Alert kind="warning">No client character has been published yet. Ask an admin.</Alert>
      )}
      {!loading && ready.length === 0 && (
        <Alert kind="warning">
          You need a resume that is ready. Upload one on the My resume page.
        </Alert>
      )}
      {error && <Alert kind="error">{error}</Alert>}

      <Card className="stack">
        <h2>Start a new chat</h2>
        <Select
          label="Client"
          value={chosenPersona}
          onChange={(e) => setPersonaKey(e.target.value)}
        >
          {(personas.data ?? []).map((p) => (
            <option key={p.key} value={p.key}>
              {p.title} (v{p.version_no}): {p.summary}
            </option>
          ))}
        </Select>
        <Select
          label="Your resume"
          value={chosenProfile}
          onChange={(e) => setProfileId(e.target.value)}
        >
          {ready.map((p) => (
            <option key={p.id} value={p.id}>
              {p.filename}
            </option>
          ))}
        </Select>
        <div>
          <Button
            disabled={!chosenPersona || !chosenProfile || starting}
            onClick={() => open(() => api.startSession(chosenPersona, chosenProfile), setStarting)}
          >
            {starting ? 'Starting…' : 'Start the chat'}
          </Button>
        </div>
      </Card>

      <Card className="stack">
        <h2>Your earlier chats</h2>
        {sessions.error && <Alert kind="error">{sessions.error}</Alert>}
        {sessions.data?.length === 0 && <p>No earlier chats.</p>}
        {!!sessions.data?.length && (
          <>
            <Select
              label="Earlier chat"
              value={earlierId || sessions.data[0].id}
              onChange={(e) => setEarlierId(e.target.value)}
            >
              {sessions.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {shortDate(s.started_at)} · {s.persona.key} · {s.status} · {s.turns_used} of{' '}
                  {s.max_turns} messages
                </option>
              ))}
            </Select>
            <div>
              <Button
                variant="secondary"
                onClick={() => open(() => api.getSession(earlierId || sessions.data![0].id))}
              >
                Open
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
