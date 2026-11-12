import { useState } from 'react';
import { api } from '../api/client';
import { isActive, useRun } from '../state/useRun';
import Button from '../components/Button';
import HistoryView from '../components/HistoryView';
import JsonUploader, { type UploadedFile } from '../components/JsonUploader';
import RunPanel from '../components/RunPanel';
import { useToast } from '../components/Toast';

type Tab = 'new' | 'history';

export default function User() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('new');

  // fresh-run state (kept when switching tabs)
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const active = useRun(activeRunId);

  // run opened from History (full width)
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const opened = useRun(openRunId);

  async function run() {
    if (!file) return;
    setStarting(true);
    try {
      const { run_id } = await api.startRun({ filename: file.name, payload: file.payload });
      setActiveRunId(run_id);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setStarting(false);
    }
  }

  const busy = starting || isActive(active.run) || (!!activeRunId && !active.run && !active.error);

  const tabBtn = (t: Tab, label: string) => (
    <button
      role="tab"
      aria-selected={tab === t}
      onClick={() => {
        setTab(t);
        setOpenRunId(null);
      }}
      className={`-mb-px h-10 border-b-2 px-4 text-sm font-medium ${
        tab === t
          ? 'border-accent text-heading'
          : 'border-transparent text-body hover:bg-highlight hover:text-heading'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h1 className="mb-4">Bias Flagging Agent</h1>
      <div role="tablist" className="mb-6 flex border-b border-line">
        {tabBtn('new', 'New run')}
        {tabBtn('history', 'History')}
      </div>

      {tab === 'new' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section
            aria-label="Input"
            className="min-w-0 rounded-md border border-line bg-surface p-5"
          >
            <h2>Input</h2>
            <p className="mb-4 text-sm text-body">
              Text is split into one record per paragraph; JSON files are checked as given.
            </p>
            <JsonUploader value={file} onChange={setFile} disabled={busy} />
            <Button className="mt-4 w-full" disabled={!file || busy} onClick={run}>
              {busy ? 'Running…' : 'Run agent'}
            </Button>
          </section>

          <section
            aria-label="Output"
            className="min-h-[24rem] min-w-0 rounded-md border border-line bg-surface p-5"
          >
            {activeRunId ? (
              <RunPanel run={active.run} error={active.error} onDecide={active.decide} />
            ) : (
              <div className="grid h-full min-h-[20rem] place-items-center text-center text-body">
                <div>
                  <p className="font-medium text-heading">No output yet</p>
                  <p className="mt-1 text-sm">
                    Add input and press “Run agent”. Progress, review and results show up here.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'history' &&
        (openRunId ? (
          <section
            aria-label="Run details"
            className="rounded-md border border-line bg-surface p-6"
          >
            <Button variant="ghost" size="sm" className="mb-4" onClick={() => setOpenRunId(null)}>
              ← Back to history
            </Button>
            <RunPanel run={opened.run} error={opened.error} onDecide={opened.decide} />
          </section>
        ) : (
          <HistoryView onOpen={setOpenRunId} />
        ))}
    </div>
  );
}
