import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Spinner, type AlertKind } from '@/components/ui';
import {
  ApiError,
  useApi,
  type ConfigKeySummary,
  type PersonaConfig,
  type PersonaConfig as P,
} from '../api';
import { PersonaEditor, emptyPersona, validatePersona } from '../components/PersonaEditor';
import { StatusBadge } from '../components/StatusBadge';
import { useAsync } from '../hooks/useAsync';

type Flash = { kind: AlertKind; text: string };
const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.detail : fallback);

export function PersonaTab() {
  const api = useApi();
  const configs = useAsync(() => api.listConfig('persona'), []);

  return (
    <div className="stack">
      <h2>Character cards</h2>
      <p>
        A character card describes the client the trainee talks to. Edit a draft, then publish it. A
        published version never changes; start a new version to change it.
      </p>
      {configs.loading && <Spinner />}
      {configs.error && <Alert kind="error">{configs.error}</Alert>}
      {configs.data?.map((c) => (
        <KeyCard key={c.key} summary={c} onChanged={configs.reload} />
      ))}
      <NewCard onCreated={configs.reload} />
    </div>
  );
}

function KeyCard({ summary, onChanged }: { summary: ConfigKeySummary; onChanged: () => void }) {
  const api = useApi();
  const sorted = [...summary.versions].sort((a, b) => a.version_no - b.version_no);
  const latest = sorted[sorted.length - 1];
  const [versionNo, setVersionNo] = useState(latest.version_no);
  // Explicit state: deriving "open" from the version count would collapse the card (and hide the
  // new draft) the moment "Start a new version" adds a second version.
  const [open, setOpen] = useState(summary.versions.length === 1);
  const selected = sorted.find((v) => v.version_no === versionNo) ?? latest;
  const loaded = useAsync(
    () => api.getVersion('persona', summary.key, selected.version_no),
    [summary.key, selected.version_no, selected.status],
  );
  const [draft, setDraft] = useState<P>();
  const [flash, setFlash] = useState<Flash>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loaded.data) setDraft(structuredClone(loaded.data.config as PersonaConfig));
  }, [loaded.data]);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setFlash(undefined);
    try {
      await fn();
    } catch (e) {
      setFlash({ kind: 'error', text: errText(e, 'That did not work.') });
    } finally {
      setBusy(false);
    }
  }

  const isDraft = selected.status === 'draft';

  return (
    <Card>
      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>
          <strong>{summary.key}</strong> · latest v{latest.version_no}{' '}
          <StatusBadge status={latest.status} />
        </summary>
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          <Select
            label="Version"
            value={selected.version_no}
            onChange={(e) => setVersionNo(+e.target.value)}
          >
            {sorted.map((v) => (
              <option key={v.id} value={v.version_no}>
                v{v.version_no} · {v.status}
              </option>
            ))}
          </Select>
          {flash && <Alert kind={flash.kind}>{flash.text}</Alert>}
          {loaded.loading && <Spinner />}
          {loaded.error && <Alert kind="error">{loaded.error}</Alert>}

          {draft && isDraft && (
            <>
              <PersonaEditor value={draft} onChange={setDraft} disabled={busy} />
              <div className="row">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      const problems = validatePersona(draft);
                      if (problems.length) throw new ApiError(422, problems.join('\n'));
                      await api.saveDraft(summary.key, selected.version_no, draft);
                      setFlash({ kind: 'success', text: 'Draft saved.' });
                    })
                  }
                >
                  Save the draft
                </Button>
                <Button
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await api.publish(summary.key, selected.version_no);
                      onChanged();
                      setFlash({ kind: 'success', text: `v${selected.version_no} is published.` });
                    })
                  }
                >
                  Publish this version
                </Button>
              </div>
            </>
          )}

          {loaded.data && !isDraft && (
            <>
              <Alert kind="info">A {selected.status} version never changes.</Alert>
              <pre style={{ margin: 0, overflowX: 'auto' }}>
                {JSON.stringify(loaded.data.config, null, 2)}
              </pre>
            </>
          )}

          <div>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  const v = await api.newPersonaVersion(summary.key);
                  setVersionNo(v.version_no);
                  onChanged();
                  setFlash({ kind: 'success', text: `Started v${v.version_no} as a draft.` });
                })
              }
            >
              Start a new version from the latest
            </Button>
          </div>
        </div>
      </details>
    </Card>
  );
}

function NewCard({ onCreated }: { onCreated: () => void }) {
  const api = useApi();
  const [key, setKey] = useState('');
  const [config, setConfig] = useState<PersonaConfig>(emptyPersona);
  const [flash, setFlash] = useState<Flash>();
  const [busy, setBusy] = useState(false);

  async function create() {
    setFlash(undefined);
    const problems = validatePersona(config);
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(key))
      problems.unshift('Key: use lowercase letters, digits and dashes.');
    if (problems.length) {
      setFlash({ kind: 'error', text: problems.join(' ') });
      return;
    }
    setBusy(true);
    try {
      await api.createPersona(key, config);
      setKey('');
      setFlash({ kind: 'success', text: `Saved "${key}" as version 1 (draft).` });
      onCreated();
    } catch (e) {
      setFlash({ kind: 'error', text: errText(e, 'Could not save.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <details>
        <summary>
          <strong>New character card</strong>
        </summary>
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          <Input
            label="Key"
            helper="Lowercase letters, digits and dashes, e.g. verma-strict."
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <PersonaEditor value={config} onChange={setConfig} disabled={busy} />
          {flash && <Alert kind={flash.kind}>{flash.text}</Alert>}
          <div>
            <Button disabled={busy} onClick={create}>
              Save as version 1 (draft)
            </Button>
          </div>
        </div>
      </details>
    </Card>
  );
}
