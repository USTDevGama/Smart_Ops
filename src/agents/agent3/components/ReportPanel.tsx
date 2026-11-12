import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Spinner } from '@/components/ui';
import { ApiError, useApi, type ReportFormat } from '../api';
import { useAsync, usePolling } from '../hooks/useAsync';

type Props = {
  sessionId: string;
  isAdmin: boolean;
  /**
   * Trainee view: ask the API to start the report once per visit.
   * Admin review list: never start one automatically (use "Generate it again").
   */
  ensure: boolean;
};

const FORMATS: { id: ReportFormat; label: string }[] = [
  { id: 'pdf', label: 'PDF' },
  { id: 'html', label: 'HTML' },
  { id: 'md', label: 'Markdown' },
];

export function ReportPanel({ sessionId, isAdmin, ensure }: Props) {
  const api = useApi();
  const status = useAsync(() => api.getReport(sessionId), [sessionId]);
  const [problem, setProblem] = useState<string>();
  const [note, setNote] = useState<string>();
  const asked = useRef(false);

  // Ask for the report once per visit (trainee), then poll every 3s while it is generating.
  useEffect(() => {
    if (!ensure || asked.current) return;
    asked.current = true;
    api
      .requestReport(sessionId)
      .then(() => status.reload())
      .catch((e) => {
        // 409 = "chat not ended" or "no scoring model". The status below already explains both,
        // so showing the raw server message as well would only repeat it.
        if (e instanceof ApiError && e.status === 409) return status.reload();
        setProblem(e instanceof ApiError ? e.detail : 'Could not start the report.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, ensure]);

  usePolling(status.data?.state === 'generating', 3000, status.reload);

  async function regenerate() {
    setProblem(undefined);
    try {
      const s = await api.requestReport(sessionId);
      setNote(s.queued ? 'Started a new report job.' : 'A report job is already running.');
      status.reload();
    } catch (e) {
      setProblem(e instanceof ApiError ? e.detail : 'Could not start the report.');
    }
  }

  async function download(format: ReportFormat) {
    try {
      const blob = await api.downloadReport(sessionId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${sessionId.slice(0, 8)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setProblem(e instanceof ApiError ? e.detail : 'Download failed.');
    }
  }

  const s = status.data;
  return (
    <section className="stack-sm" aria-label="Report">
      <h3>Report</h3>
      {status.loading && <Spinner />}
      {status.error && <Alert kind="error">{status.error}</Alert>}
      {problem && <Alert kind="error">{problem}</Alert>}
      {note && <Alert kind="info">{note}</Alert>}
      {s?.state === 'not_ended' && (
        <p className="caption">The report appears once the chat has ended.</p>
      )}
      {s?.state === 'generating' && (
        <>
          {s.model_configured ? (
            <Alert kind="info">The report is being prepared. This page updates by itself.</Alert>
          ) : (
            <Alert kind="warning">
              {isAdmin
                ? 'Reports need a scoring model. Set PODC_LLM_PROVIDER (and its keys) on the server.'
                : 'The report cannot be prepared right now. An admin needs to set up scoring.'}
            </Alert>
          )}
          {(isAdmin || !ensure) && (
            <div>
              <Button variant="secondary" compact onClick={regenerate}>
                Generate it again
              </Button>
            </div>
          )}
        </>
      )}
      {s?.state === 'ready' &&
        (isAdmin && s.can_download ? (
          <div className="stack-sm">
            <Alert kind="success">The report is ready.</Alert>
            <div className="row">
              {FORMATS.filter((f) => s.formats.includes(f.id)).map((f) => (
                <Button key={f.id} variant="secondary" compact onClick={() => download(f.id)}>
                  Download {f.label}
                </Button>
              ))}
              <Button variant="secondary" compact onClick={regenerate}>
                Generate it again
              </Button>
            </div>
          </div>
        ) : (
          <Alert kind="success">The report is ready and has gone to an admin for review.</Alert>
        ))}
    </section>
  );
}
