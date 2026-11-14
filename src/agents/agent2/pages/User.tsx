import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { isActive, useRun } from '../state/useRun';
import { flagKey } from '../util/format';
import Button from '../components/Button';
import type { FlagDescriptions } from '../components/FlagFacts';
import HistoryView from '../components/HistoryView';
import JsonUploader, { type UploadedFile } from '../components/JsonUploader';
import RunError from '../components/RunError';
import RunPanel from '../components/RunPanel';
import { toRunFailure, type RunFailure } from '../util/apiError';

type Tab = 'new' | 'history';

export default function User() {
  const [tab, setTab] = useState<Tab>('new');

  // fresh-run state (kept when switching tabs)
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  // Why the last run could not start. Stays next to the form until the input changes or the person tries again.
  const [failure, setFailure] = useState<RunFailure | null>(null);
  const active = useRun(activeRunId);

  // run opened from History (full width)
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const opened = useRun(openRunId);

  // The agent output has only the flag name; its description comes from the flags table.
  // If loading fails, the cards still show and say the description is not available.
  const [descriptions, setDescriptions] = useState<FlagDescriptions>({});
  useEffect(() => {
    let cancelled = false;
    api
      .listFlags()
      .then((flags) => {
        if (cancelled) return;
        setDescriptions(Object.fromEntries(flags.map((f) => [flagKey(f.name), f.description])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function run() {
    if (!file) return;
    setStarting(true);
    setFailure(null);
    try {
      const { run_id } = await api.startRun({ filename: file.name, payload: file.payload });
      setActiveRunId(run_id);
    } catch (e) {
      setFailure(toRunFailure(e));
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
              Plain text becomes one record per paragraph. Text has no reviewer, trainee or rating,
              so each record gets placeholders: reviewer “Unknown reviewer”, a generated id and
              trainee, and rating 3. JSON files are checked as supplied, with no placeholders added.
            </p>
            <JsonUploader
              value={file}
              onChange={(f) => {
                setFile(f);
                setFailure(null);
              }}
              disabled={busy}
            />
            <Button className="mt-4 w-full" disabled={!file || busy} onClick={run}>
              {busy ? 'Running…' : 'Run agent'}
            </Button>
            {failure && <RunError failure={failure} className="mt-4" />}
          </section>

          <section
            aria-label="Output"
            className="min-h-[24rem] min-w-0 rounded-md border border-line bg-surface p-5"
          >
            {activeRunId ? (
              <RunPanel
                run={active.run}
                error={active.error}
                descriptions={descriptions}
                onDecide={active.decide}
              />
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
            <RunPanel
              run={opened.run}
              error={opened.error}
              descriptions={descriptions}
              onDecide={opened.decide}
            />
          </section>
        ) : (
          <HistoryView onOpen={setOpenRunId} />
        ))}
    </div>
  );
}
