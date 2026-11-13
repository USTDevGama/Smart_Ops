import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, useAgent1Api } from '../api';
import type { SessionState, Turn } from '../api/types';
import { formatClock } from '../lib/format';
import { hasRecognition, hasSynthesis, listen, speak, type SpeechHandle } from '../lib/speech';

const SILENCE_MS = 7000; // gap of silence while mid-answer before auto-submitting
const THINK_MS = 5000; // pause after the question is spoken before the mic opens
const NO_SPEECH_MS = 10000; // hard cap on total silence before treating it as no answer
const REDIRECT_HOME_MS = 6000; // how long the thank-you message stays up before returning home

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Phase =
  'loading' | 'speaking' | 'thinking' | 'idle' | 'listening' | 'sending' | 'closed' | 'error';

export function InterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [params] = useSearchParams();
  const curriculum = params.get('name');
  const api = useAgent1Api();
  const navigate = useNavigate();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [draft, setDraft] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [clock, setClock] = useState<{ remaining: number; at: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [voiceOn, setVoiceOn] = useState(hasSynthesis);
  const [micOn, setMicOn] = useState(hasRecognition);
  const [autoSend, setAutoSend] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const phaseRef = useRef<Phase>('loading');
  const nextTurnRef = useRef(1);
  const draftRef = useRef('');
  const interimRef = useRef('');
  const baseRef = useRef('');
  const confRef = useRef<number | null>(null);
  const runRef = useRef(0);
  const loadRef = useRef(0);
  const speechRef = useRef<SpeechHandle | null>(null);
  const listenRef = useRef<{ abort(): void } | null>(null);
  const silenceRef = useRef<ReturnType<typeof setTimeout>>();
  const noSpeechRef = useRef<ReturnType<typeof setTimeout>>();
  const skipRef = useRef(false);
  const timingRef = useRef({ shownAt: 0, listenAt: 0, firstAt: 0 });
  const voiceRef = useRef(voiceOn);
  const micRef = useRef(micOn);
  const autoRef = useRef(autoSend);
  const logRef = useRef<HTMLDivElement>(null);

  voiceRef.current = voiceOn;
  micRef.current = micOn;
  autoRef.current = autoSend;

  const changePhase = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const changeDraft = (text: string) => {
    draftRef.current = text;
    setDraft(text);
  };

  const changeInterim = (text: string) => {
    interimRef.current = text;
    setInterim(text);
  };

  const mergeTurns = useCallback((list: Turn[]) => {
    setTurns((prev) => {
      const map = new Map(prev.map((t) => [t.turn_no, t]));
      list.forEach((t) => map.set(t.turn_no, t));
      return [...map.values()].sort((a, b) => a.turn_no - b.turn_no);
    });
  }, []);

  const stopSpeech = () => {
    skipRef.current = true;
    speechRef.current?.cancel();
    speechRef.current = null;
  };

  const stopListening = () => {
    clearTimeout(silenceRef.current);
    clearTimeout(noSpeechRef.current);
    listenRef.current?.abort();
    listenRef.current = null;
  };

  async function submit({
    text = '',
    noResponse = false,
  }: { text?: string; noResponse?: boolean } = {}) {
    if (phaseRef.current === 'sending' || !sessionId) return;
    const turnNo = nextTurnRef.current;
    stopSpeech();
    stopListening();
    changePhase('sending');
    setError('');
    setNotice('');

    const t = timingRef.current;
    const latency = (t.firstAt || Date.now()) - (t.listenAt || t.shownAt || Date.now());
    const body: Parameters<typeof api.postTurn>[1] = {
      turn_no: turnNo,
      text: noResponse ? '' : text,
      no_response: noResponse,
    };
    if (!noResponse && confRef.current != null && confRef.current > 0 && confRef.current <= 1) {
      body.stt_confidence = confRef.current;
    }
    if (latency >= 0 && !noResponse) body.response_latency_ms = Math.round(latency);

    try {
      const resp = await api.postTurn(sessionId, body);
      mergeTurns([
        {
          turn_no: turnNo,
          role: 'candidate',
          kind: noResponse ? 'no_response' : 'answer',
          text: body.text,
        },
      ]);
      changeDraft('');
      changeInterim('');
      confRef.current = null;
      await present(resp);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        await resync();
      } else {
        setError((e as Error).message);
        changePhase('idle');
      }
    }
  }

  async function resync() {
    if (!sessionId) return;
    try {
      await present(await api.getSessionState(sessionId));
    } catch (e) {
      setError((e as Error).message);
      changePhase('idle');
    }
  }

  async function present(resp: SessionState) {
    const run = ++runRef.current;
    nextTurnRef.current = resp.next_turn_no;
    setClock({ remaining: resp.remaining_min, at: Date.now() });
    mergeTurns(resp.agent_turns.map((t) => ({ ...t, role: 'agent' as const })));
    timingRef.current = { shownAt: Date.now(), listenAt: 0, firstAt: 0 };
    skipRef.current = false;

    changePhase('speaking');
    for (const turn of resp.agent_turns) {
      if (!voiceRef.current || skipRef.current) break;
      const handle = speak(turn.text);
      speechRef.current = handle;
      await handle.done;
      if (run !== runRef.current) return;
    }
    if (run !== runRef.current) return;

    if (resp.closed) {
      changePhase('closed');
    } else if (micRef.current) {
      changePhase('thinking');
      await sleep(THINK_MS);
      if (run !== runRef.current || phaseRef.current !== 'thinking') return;
      startListening();
    } else {
      changePhase('idle');
    }
  }

  function finishAnswer() {
    clearTimeout(silenceRef.current);
    const text = `${draftRef.current} ${interimRef.current}`.trim();
    stopListening();
    if (!text) {
      changePhase('idle');
      setNotice("I didn't catch anything. Tap the microphone to try again, or type your answer.");
      return;
    }
    changeDraft(text);
    changeInterim('');
    submit({ text });
  }

  function startListening() {
    if (!hasRecognition) return changePhase('idle');
    stopListening();
    baseRef.current = draftRef.current ? `${draftRef.current} ` : '';
    timingRef.current.listenAt = Date.now();
    timingRef.current.firstAt = 0;
    setNotice('');
    changeInterim('');
    changePhase('listening');
    noSpeechRef.current = setTimeout(() => {
      if (phaseRef.current !== 'listening') return;
      stopListening();
      submit({ noResponse: true });
    }, NO_SPEECH_MS);
    try {
      listenRef.current = listen({
        onText({ final, interim: partial, confidence }) {
          if (phaseRef.current !== 'listening') return;
          clearTimeout(noSpeechRef.current); // the candidate has started answering; the hard cap no longer applies
          if (!timingRef.current.firstAt) timingRef.current.firstAt = Date.now();
          confRef.current = confidence;
          changeDraft(`${baseRef.current}${final}`.trim());
          changeInterim(partial);
          clearTimeout(silenceRef.current);
          if (autoRef.current) silenceRef.current = setTimeout(finishAnswer, SILENCE_MS);
        },
        onEnd() {
          listenRef.current = null;
          if (phaseRef.current !== 'listening') return;
          if (`${draftRef.current}${interimRef.current}`.trim() && autoRef.current) finishAnswer();
          else {
            changePhase('idle');
            setNotice(
              "I didn't catch anything. Tap the microphone to try again, or type your answer.",
            );
          }
        },
        onError(code) {
          if (code === 'no-speech' || code === 'aborted') return;
          listenRef.current = null;
          changePhase('idle');
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            setMicOn(false);
            setNotice('Microphone access is blocked. Type your answer instead.');
          } else if (code === 'audio-capture') {
            setMicOn(false);
            setNotice('No microphone found. Type your answer instead.');
          } else {
            setNotice('The speech service is unreachable. Try again or type your answer.');
          }
        },
      });
    } catch {
      changePhase('idle');
    }
  }

  async function endInterview() {
    if (!sessionId) return;
    setConfirmEnd(false);
    stopSpeech();
    stopListening();
    changePhase('sending');
    try {
      await present(await api.endSession(sessionId));
    } catch (e) {
      setError((e as Error).message);
      changePhase('idle');
    }
  }

  const load = useCallback(async () => {
    if (!sessionId) return;
    const token = ++loadRef.current;
    changePhase('loading');
    setError('');
    try {
      const resp = await api.getSessionState(sessionId);
      if (token === loadRef.current) await present(resp);
    } catch (e) {
      if (token !== loadRef.current) return;
      setError(
        (e as ApiError).status === 404 ? 'This interview link is not valid.' : (e as Error).message,
      );
      changePhase('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, api]);

  useEffect(() => {
    load();
    return () => {
      loadRef.current++;
      runRef.current++;
      stopSpeech();
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [turns, interim]);

  useEffect(() => {
    if (phase !== 'closed') return;
    const t = setTimeout(() => navigate('/'), REDIRECT_HOME_MS);
    return () => clearTimeout(t);
  }, [phase, navigate]);

  const remaining = clock ? Math.max(0, clock.remaining * 60 - (now - clock.at) / 1000) : null;
  const busy = phase === 'sending' || phase === 'loading';
  const active = !['loading', 'error', 'closed'].includes(phase);

  if (phase === 'error') {
    return (
      <div className="card narrow">
        <h2>We couldn't open the interview</h2>
        <div className="alert error">{error}</div>
        <button className="primary" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  if (phase === 'closed') {
    return (
      <div className="card narrow center">
        <h2>Thank you</h2>
        <p>Your interview is complete. A human assessor will review your responses.</p>
        <p className="muted">Taking you back to the agents home page…</p>
        <button className="primary" onClick={() => navigate('/')}>
          Go to agents home now
        </button>
      </div>
    );
  }

  return (
    <div className="card interview">
      <div className="interview-head">
        <div>
          <h2>Viva interview</h2>
          {curriculum && <span className="muted small">{curriculum}</span>}
        </div>
        {remaining != null && (
          <div className={remaining < 180 ? 'timer low' : 'timer'}>
            <span className="muted small">Time left</span>
            <strong>{formatClock(remaining)}</strong>
          </div>
        )}
      </div>

      <div className="log" ref={logRef} aria-live="polite">
        {phase === 'loading' && (
          <p className="muted">Preparing your first question… this can take a few seconds.</p>
        )}
        {turns.map((t) => (
          <div key={t.turn_no} className={`bubble ${t.role}`}>
            <span className="who">{t.role === 'agent' ? 'Interviewer' : 'You'}</span>
            {t.text || <em>(skipped)</em>}
          </div>
        ))}
        {phase === 'listening' && (draft || interim) && (
          <div className="bubble candidate live">
            <span className="who">You</span>
            {draft} <span className="muted">{interim}</span>
          </div>
        )}
      </div>

      <div className="status">
        <span className={`dot ${phase}`} />
        {phase === 'loading' && 'Connecting…'}
        {phase === 'speaking' && 'Interviewer is speaking…'}
        {phase === 'thinking' && 'Take a moment to think…'}
        {phase === 'listening' && 'Listening — speak your answer'}
        {phase === 'sending' && 'Thinking…'}
        {phase === 'idle' && 'Your turn'}
      </div>

      {notice && <div className="alert info">{notice}</div>}
      {error && (
        <div className="alert error">{error} Your answer is kept. Press Send to try again.</div>
      )}

      <textarea
        rows={3}
        placeholder="Type your answer here, or use the microphone"
        value={draft}
        disabled={busy}
        onChange={(e) => {
          if (phaseRef.current === 'listening') {
            stopListening();
            changePhase('idle');
          }
          changeDraft(e.target.value);
        }}
      />

      <div className="row dock">
        {hasRecognition && micOn && (
          <button
            className={phase === 'listening' ? 'mic on' : 'mic'}
            disabled={busy}
            onClick={() => {
              if (phase === 'listening') return finishAnswer();
              stopSpeech();
              startListening();
            }}
          >
            {phase === 'listening' ? 'Done' : 'Answer by voice'}
          </button>
        )}
        <button
          className="primary"
          disabled={busy || !draft.trim()}
          onClick={() => submit({ text: draft.trim() })}
        >
          Send
        </button>
        <button
          disabled={busy}
          onClick={() => submit({ noResponse: true })}
          title="Skipping twice in a row ends the interview"
        >
          Skip question
        </button>
        {phase === 'speaking' && <button onClick={stopSpeech}>Skip speech</button>}
        <span className="spacer" />
        {confirmEnd ? (
          <>
            <button className="danger" onClick={endInterview}>
              Yes, end now
            </button>
            <button onClick={() => setConfirmEnd(false)}>Cancel</button>
          </>
        ) : (
          <button className="link" disabled={!active} onClick={() => setConfirmEnd(true)}>
            End interview
          </button>
        )}
      </div>

      <div className="row options">
        {hasSynthesis && (
          <label className="check">
            <input
              type="checkbox"
              checked={voiceOn}
              onChange={(e) => setVoiceOn(e.target.checked)}
            />
            Read questions aloud
          </label>
        )}
        {hasRecognition && (
          <label className="check">
            <input
              type="checkbox"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
            />
            Send automatically when I pause
          </label>
        )}
      </div>
    </div>
  );
}
