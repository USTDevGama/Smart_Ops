import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgent1Api } from '../api';
import type { Curriculum, Track } from '../api/types';

const MAX_CHARS = 400_000;
const ICONS = [
  '\u{1F3AF}',
  '⚙️',
  '\u{1F9E9}',
  '\u{1F680}',
  '\u{1F527}',
  '\u{1F4A1}',
  '\u{1F6E0}️',
  '\u{1F4CA}',
];

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

type Step = 'upload' | 'tracks';

/**
 * Candidate's first screen: submit/update the curriculum, review the derived tracks, then start
 * the interview on this same device (fully self-serve - no admin hand-off link). Port of
 * Smart_Ops_Pod1's Upload.jsx + Tracks.jsx, moved from the admin role to the trainee role.
 */
export function CurriculumPage() {
  const api = useAgent1Api();
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);

  const [step, setStep] = useState<Step>('upload');
  const [text, setText] = useState('');
  const [fileNote, setFileNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(key: string) {
    setExpanded((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function ingest(
    payload: { name: string; document_text: string },
    onStatus: (s: string) => void,
    signal: AbortSignal,
  ): Promise<Curriculum> {
    onStatus('Uploading curriculum…');
    let cur = await api.createCurriculum(payload);
    const started = Date.now();
    let delay = 2000;
    while (cur.status === 'ingesting') {
      if (Date.now() - started > 5 * 60_000) {
        throw new Error('Curriculum is still processing. Try again in a few minutes.');
      }
      onStatus('Extracting topics and deriving tracks… this can take a minute.');
      await sleep(delay, signal);
      delay = Math.min(delay * 1.5, 10_000);
      cur = await api.getCurriculum(cur.curriculum_id);
    }
    if (cur.status === 'failed')
      throw new Error(cur.status_detail || 'Curriculum processing failed.');
    return cur;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setFileNote('Reading PDF…');
    try {
      const { extractPdfText } = await import('../lib/pdf');
      const extracted = await extractPdfText(file);
      setText(extracted);
      setFileNote(
        extracted.trim()
          ? `Extracted ${extracted.length.toLocaleString()} characters from ${file.name}.`
          : 'No text found in this PDF (scanned documents are not supported). Paste the text instead.',
      );
    } catch {
      setFileNote('');
      setError('Could not read that PDF. Paste the curriculum text instead.');
    }
  }

  async function begin() {
    setError('');
    if (!text.trim()) return setError('Upload a PDF or paste the curriculum text.');
    if (text.length > MAX_CHARS) {
      return setError(`The document is too long (limit ${MAX_CHARS.toLocaleString()} characters).`);
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    try {
      const autoName = `Curriculum ${new Date().toLocaleString()}`;
      const cur = await ingest(
        { name: autoName, document_text: text.trim() },
        setStatus,
        controller.signal,
      );
      const trks = await api.getTracks(cur.curriculum_id);
      setCurriculum(cur);
      setTracks(trks);
      setStep('tracks');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setBusy(false);
      setStatus('');
    }
  }

  async function startInterview() {
    if (!curriculum) return;
    setBusy(true);
    setError('');
    try {
      const session = await api.startIntake(curriculum.curriculum_id);
      navigate(
        `/agents/agent1/session/${session.session_id}/briefing?name=${encodeURIComponent(curriculum.name)}`,
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (step === 'tracks' && curriculum && tracks) {
    const totalTopics = tracks.reduce((sum, t) => sum + t.topics.length, 0);
    return (
      <div className="tracks-page">
        <div className="hero-card">
          <span className="eyebrow">Curriculum ready</span>
          <h1>{curriculum.name}</h1>
          <p className="muted">
            The interviewer has broken this curriculum into <strong>{tracks.length}</strong> tracks
            covering <strong>{totalTopics}</strong> topics.
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">{tracks.length}</span>
              <span className="stat-label">Tracks</span>
            </div>
            <div className="stat">
              <span className="stat-value">{totalTopics}</span>
              <span className="stat-label">Topics</span>
            </div>
          </div>
        </div>

        {tracks.length > 0 && (
          <div className="tracks-grid">
            {tracks.map((track, i) => (
              <div
                key={track.track_key}
                className="track-card"
                style={{ '--accent': `hsl(${(i * 47) % 360} 70% 60%)` } as React.CSSProperties}
              >
                <div className="track-card-head">
                  <span className="track-icon">{ICONS[i % ICONS.length]}</span>
                  <div>
                    <strong>{track.track_name}</strong>
                    <span className="muted small">
                      {track.topics.length} topic{track.topics.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                {track.topics.length > 0 && (
                  <ul className="topics">
                    {track.topics
                      .slice(0, expanded.has(track.track_key) ? undefined : 4)
                      .map((t) => (
                        <li key={t.topic_id}>{t.topic_name}</li>
                      ))}
                    {track.topics.length > 4 &&
                      (expanded.has(track.track_key) ? (
                        <li>
                          <button
                            className="link small"
                            onClick={() => toggleExpand(track.track_key)}
                          >
                            Show less
                          </button>
                        </li>
                      ) : (
                        <li>
                          <button
                            className="link small"
                            onClick={() => toggleExpand(track.track_key)}
                          >
                            +{track.topics.length - 4} more
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="card narrow">
            <div className="alert error">{error}</div>
          </div>
        )}

        <div className="hero-card center">
          <p className="muted">Ready when you are.</p>
          <button className="primary start" onClick={startInterview} disabled={busy}>
            {busy ? 'Starting…' : 'Start interview'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card narrow">
      <div className="upload-header">
        <h1>Viva Interview</h1>
        <p className="muted">Upload or update your curriculum to begin</p>
      </div>

      <div className="field">
        <label htmlFor="cfile">Upload curriculum PDF</label>
        <input id="cfile" type="file" accept="application/pdf" onChange={onFile} disabled={busy} />
        {fileNote && <span className="muted small">{fileNote}</span>}
      </div>

      <div className="divider">
        <span>or</span>
      </div>

      <div className="field">
        <label htmlFor="ctext">Paste curriculum text</label>
        <textarea
          id="ctext"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          placeholder="Paste your curriculum content here..."
        />
      </div>

      {error && <div className="alert error">{error}</div>}
      {busy && <div className="alert info">{status}</div>}

      <button className="primary start" onClick={begin} disabled={busy || !text.trim()}>
        {busy ? 'Processing…' : 'Continue'}
      </button>
    </div>
  );
}
