import { useState } from 'react';
import {
  Alert,
  Button,
  FilePicker,
  Table,
  Textarea,
  Spinner,
  type AlertKind,
} from '@/components/ui';
import { ApiError, useApi, type ScenarioConfig } from '../api';
import { SAMPLE_SCENARIO } from '../api/mockApi';
import { StatusBadge } from '../components/StatusBadge';
import { useAsync } from '../hooks/useAsync';

type Row = { key: string; version: number; status: string; title: string; situation: string };

export function SituationsTab() {
  const api = useApi();
  const [json, setJson] = useState(() => JSON.stringify({ scenarios: [SAMPLE_SCENARIO] }, null, 2));
  const [flash, setFlash] = useState<{ kind: AlertKind; text: string }>();
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<File | null>(null);

  const rows = useAsync<Row[]>(async () => {
    const keys = await api.listConfig('scenario');
    return Promise.all(
      keys.map(async (k) => {
        const latest = Math.max(...k.versions.map((v) => v.version_no));
        const v = await api.getVersion('scenario', k.key, latest);
        const c = v.config as ScenarioConfig;
        return {
          key: k.key,
          version: latest,
          status: v.status,
          title: c.title,
          situation: c.situation,
        };
      }),
    );
  }, []);

  async function readFile(file: File | null) {
    setPicked(file);
    if (file) setJson(await file.text());
  }

  async function load() {
    setFlash(undefined);
    let scenarios: ScenarioConfig[];
    try {
      const parsed = JSON.parse(json) as { scenarios?: ScenarioConfig[] } | ScenarioConfig[];
      scenarios = Array.isArray(parsed) ? parsed : (parsed.scenarios ?? []);
      if (!scenarios.length) throw new Error('No situations found. Use {"scenarios": [...]}.');
    } catch (e) {
      setFlash({ kind: 'error', text: `This is not valid JSON: ${(e as Error).message}` });
      return;
    }
    setBusy(true);
    try {
      const r = await api.importScenarios(scenarios);
      setFlash({
        kind: 'success',
        text: `${r.created.length} new, ${r.updated.length} updated, ${r.unchanged.length} unchanged.`,
      });
      rows.reload();
    } catch (e) {
      setFlash({ kind: 'error', text: e instanceof ApiError ? e.detail : 'Import failed.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h2>Situations</h2>
      <p>
        Load the situations the client can bring up. Loading the same situation again changes
        nothing.
      </p>
      <FilePicker
        label="Situations JSON file"
        buttonText="Choose JSON file"
        accept=".json,application/json"
        file={picked}
        onFile={readFile}
      />
      <Textarea
        label="Situations (JSON)"
        rows={12}
        value={json}
        onChange={(e) => setJson(e.target.value)}
      />
      {flash && <Alert kind={flash.kind}>{flash.text}</Alert>}
      <div>
        <Button onClick={load} disabled={busy}>
          Load the situations
        </Button>
      </div>

      <h3>Loaded situations</h3>
      {rows.loading && <Spinner />}
      {rows.error && <Alert kind="error">{rows.error}</Alert>}
      {rows.data && (
        <Table
          rows={rows.data}
          rowKey={(r) => r.key}
          empty="No situations are loaded."
          columns={[
            { key: 'key', header: 'Key', render: (r) => r.key },
            { key: 'v', header: 'Version', render: (r) => `v${r.version}` },
            { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 't', header: 'Title', render: (r) => r.title },
            { key: 'si', header: 'Situation', render: (r) => r.situation },
          ]}
        />
      )}
    </div>
  );
}
