import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { hasRecognition, hasSynthesis, speak } from '../lib/speech';

export function BriefingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const curriculum = params.get('name');
  const [mic, setMic] = useState('');

  async function testMic() {
    setMic('Checking…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMic('Microphone is working.');
    } catch {
      setMic(
        'Microphone is blocked or missing. Allow access in the browser, or type your answers instead.',
      );
    }
  }

  function start() {
    navigate(
      `/agents/agent1/session/${sessionId}/interview${curriculum ? `?name=${encodeURIComponent(curriculum)}` : ''}`,
    );
  }

  return (
    <div className="card narrow">
      <h2>Your interview</h2>
      {curriculum && (
        <p className="topic">
          Curriculum: <strong>{curriculum}</strong>
        </p>
      )}

      <h3>What this is</h3>
      <p>
        A spoken oral exam (viva) on the curriculum above. An AI interviewer asks one question at a
        time and listens to your answer. It starts with foundational questions on each area, then
        goes deeper where you do well, and may ask follow-ups when an answer needs more detail.
      </p>

      <h3>How it works</h3>
      <ul>
        <li>Questions are read aloud. Answer out loud, or type if you prefer.</li>
        <li>
          The interview is timed. The clock starts when you press Start and a countdown is shown.
        </li>
        <li>You can skip a question or end the interview early at any time.</li>
        <li>
          Your transcript is saved and reviewed by a human assessor. Results are not shown to you.
        </li>
      </ul>

      <h3>Before you start</h3>
      {!hasRecognition && (
        <div className="alert error">
          Voice answers need Chrome or Edge. You can still take the interview by typing.
        </div>
      )}
      <div className="row">
        <button onClick={testMic} disabled={!hasRecognition}>
          Test microphone
        </button>
        <button
          onClick={() => speak('Hello. If you can hear this, your speakers are working.')}
          disabled={!hasSynthesis}
        >
          Test speakers
        </button>
      </div>
      {mic && <p className="muted small">{mic}</p>}

      <button className="primary start" onClick={start}>
        Start interview
      </button>
    </div>
  );
}
