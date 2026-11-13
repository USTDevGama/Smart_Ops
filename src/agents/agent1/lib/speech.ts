/* eslint-disable @typescript-eslint/no-explicit-any -- Web Speech API has no standard TS lib types */

const w: any = typeof window !== 'undefined' ? window : {};

export const SpeechRecognitionImpl: any = w.SpeechRecognition || w.webkitSpeechRecognition;
export const hasRecognition = Boolean(SpeechRecognitionImpl);
export const hasSynthesis = 'speechSynthesis' in w;

function chunk(text: string): string[] {
  const parts = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*\s*/g) || [text];
  const out: string[] = [];
  let cur = '';
  for (const p of parts) {
    if (cur && (cur + p).length > 200) {
      out.push(cur.trim());
      cur = p;
    } else {
      cur += p;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// The voice is resolved once and reused for the whole session so it never audibly changes mid-interview
// (Chrome's voice list loads asynchronously, so picking fresh per sentence can land on a different voice
// for the first few sentences than for the rest).
let _voicePromise: Promise<any> | null = null;

function pickVoice(voices: any[]) {
  return (
    voices.find((v) => /female/i.test(v.name)) ||
    voices.find((v) => /en[-_]US/i.test(v.lang) && /google|natural|online/i.test(v.name)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  );
}

function voicesAvailable(): Promise<any[]> {
  return new Promise((resolve) => {
    const have = w.speechSynthesis.getVoices();
    if (have.length) return resolve(have);
    const onChange = () => {
      const v = w.speechSynthesis.getVoices();
      if (v.length) {
        w.speechSynthesis.removeEventListener('voiceschanged', onChange);
        resolve(v);
      }
    };
    w.speechSynthesis.addEventListener('voiceschanged', onChange);
    setTimeout(() => resolve(w.speechSynthesis.getVoices()), 1000); // safety net: some browsers never fire the event
  });
}

function resolveVoice() {
  if (!_voicePromise) _voicePromise = voicesAvailable().then(pickVoice);
  return _voicePromise;
}

if (hasSynthesis) resolveVoice(); // pre-warm so the first question doesn't pay the resolution delay

export interface SpeechHandle {
  done: Promise<void>;
  cancel(): void;
}

// Speaks text sentence by sentence (Chrome stops long utterances). `done` always resolves.
export function speak(text: string): SpeechHandle {
  if (!hasSynthesis) return { done: Promise.resolve(), cancel() {} };
  const synth = w.speechSynthesis;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout>;
  const done: Promise<void> = resolveVoice()!.then(
    (voice) =>
      new Promise<void>((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          resolve();
        };
        if (cancelled) return finish();
        timer = setTimeout(finish, text.length * 95 + 5000); // safety net if the browser never fires onend
        const parts = chunk(text);
        let i = 0;
        const next = () => {
          if (cancelled || i >= parts.length) return finish();
          const u = new w.SpeechSynthesisUtterance(parts[i++]);
          u.lang = 'en-US';
          u.rate = 0.97;
          if (voice) u.voice = voice;
          u.onend = next;
          u.onerror = finish;
          synth.speak(u);
        };
        next();
      }),
  );
  return {
    done,
    cancel() {
      cancelled = true;
      synth.cancel();
    },
  };
}

export interface ListenHandle {
  abort(): void;
}

export function listen({
  onText,
  onEnd,
  onError,
}: {
  onText: (r: { final: string; interim: string; confidence: number | null }) => void;
  onEnd: () => void;
  onError: (code: string) => void;
}): ListenHandle {
  const rec = new SpeechRecognitionImpl();
  rec.lang = 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = '';
  let confSum = 0;
  let confN = 0;

  rec.onresult = (e: any) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) {
        finalText += `${r[0].transcript} `;
        if (r[0].confidence > 0) {
          confSum += r[0].confidence;
          confN++;
        }
      } else {
        interim += r[0].transcript;
      }
    }
    onText({
      final: finalText.trim(),
      interim: interim.trim(),
      confidence: confN ? confSum / confN : null,
    });
  };
  rec.onerror = (e: any) => onError(e.error);
  rec.onend = () => onEnd();
  rec.start();
  return { abort: () => rec.abort() };
}
