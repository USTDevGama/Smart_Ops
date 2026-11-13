import { useRef, useState, type DragEvent } from 'react';
import { fmtBytes } from '../util/format';
import Alert from './Alert';
import Button from './Button';

export interface UploadedFile {
  name: string;
  size: number;
  kind: 'json' | 'text';
  payload: unknown;
}

const TEXT_EXT = /\.(txt|text|md)$/i;
const JSON_EXT = /\.json$/i;

/** What plain text has no way to say. Used for every paragraph, so the backend's required fields are all present. */
export const TEXT_PLACEHOLDER_REVIEWER = 'Unknown reviewer';
export const TEXT_PLACEHOLDER_RATING = 3;

/**
 * Plain text becomes the same shape as the JSON samples ({ dataset, records: [{ id, reviewer, trainee, rating,
 * comment }] }). Each blank-line separated paragraph is one record (a file with no blank lines is split per
 * non-empty line). Text carries no metadata, so each record gets neutral placeholders: reviewer "Unknown reviewer",
 * rating 3, and a unique generated id and trainee. JSON files are not touched; the backend checks them as supplied.
 */
export function textToPayload(name: string, text: string) {
  const normalised = text.replace(/\r\n?/g, '\n').trim();
  const blocks = /\n\s*\n/.test(normalised) ? normalised.split(/\n\s*\n/) : normalised.split('\n');
  const records = blocks
    .map((b) => b.trim().replace(/\s*\n\s*/g, ' '))
    .filter(Boolean)
    .map((comment, i) => {
      const n = String(i + 1).padStart(3, '0');
      return {
        id: `TXT-${n}`,
        reviewer: TEXT_PLACEHOLDER_REVIEWER,
        trainee: `UNKNOWN-${n}`,
        rating: TEXT_PLACEHOLDER_RATING,
        comment,
      };
    });
  return { dataset: name, records };
}

const PASTED_NAME = 'pasted-text.txt';
const MAX_BYTES = 5 * 1024 * 1024; // UI-side guard only; the backend must enforce its own limit.

export default function JsonUploader({
  value,
  onChange,
  disabled,
}: {
  value: UploadedFile | null;
  onChange: (f: UploadedFile | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pasted, setPasted] = useState('');

  /** A loaded file replaces the box with a summary card. Typed or pasted text stays editable in the box. */
  const showFileCard = value !== null && value.name !== PASTED_NAME;

  async function ingest(name: string, text: string, size: number) {
    if (size > MAX_BYTES)
      return setError(`File is ${fmtBytes(size)}; the limit is ${fmtBytes(MAX_BYTES)}.`);
    if (TEXT_EXT.test(name)) {
      if (!text.trim()) return setError('The text file is empty.');
      onChange({ name, size, kind: 'text', payload: textToPayload(name, text) });
      setPasted('');
      setError(null);
      return;
    }
    if (!JSON_EXT.test(name))
      return setError('Unsupported file type. Upload a .json or .txt file.');
    try {
      onChange({ name, size, kind: 'json', payload: JSON.parse(text) });
      setPasted('');
      setError(null);
    } catch (e) {
      setError(`Not valid JSON: ${(e as Error).message}`);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    await ingest(file.name, await file.text(), file.size);
  }

  /** Every edit updates the parent, so "Run agent" works straight after typing or pasting. */
  function handleText(text: string) {
    setPasted(text);
    if (!text.trim()) {
      setError(null);
      return onChange(null);
    }
    const size = new TextEncoder().encode(text).length;
    if (size > MAX_BYTES) {
      setError(`Text is ${fmtBytes(size)}; the limit is ${fmtBytes(MAX_BYTES)}.`);
      return onChange(null);
    }
    setError(null);
    onChange({ name: PASTED_NAME, size, kind: 'text', payload: textToPayload(PASTED_NAME, text) });
  }

  async function useSample() {
    const res = await fetch('/sample-input.json');
    const text = await res.text();
    await ingest('sample-input.json', text, text.length);
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) void handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div>
      {!showFileCard ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-md border border-dashed transition-colors ${
            dragging ? 'border-accent bg-highlight' : 'border-neu-300 bg-neu-50'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
            <p className="text-sm text-body">Upload a JSON or text file, or type or paste below.</p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
              >
                Upload file
              </Button>
              <Button variant="ghost" size="sm" disabled={disabled} onClick={useSample}>
                Use sample file
              </Button>
            </div>
          </div>
          <label htmlFor="input-text" className="sr-only">
            Text to check
          </label>
          <textarea
            id="input-text"
            rows={10}
            value={pasted}
            disabled={disabled}
            onChange={(e) => handleText(e.target.value)}
            placeholder="Paste or type feedback text here, or drop a file anywhere in this box. Separate comments with a blank line; each paragraph is checked as one record."
            className="block w-full resize-y bg-transparent px-3 py-3 text-sm text-heading placeholder:text-neu-500 focus:bg-surface disabled:text-neu-500"
          />
          <p className="border-t border-line px-3 py-1.5 text-xs text-body">
            {pasted.trim() ? `${fmtBytes(new TextEncoder().encode(pasted).length)} · ` : ''}Max{' '}
            {fmtBytes(MAX_BYTES)}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".json,.txt,.text,.md,application/json,text/plain"
            className="hidden"
            data-testid="file-input"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      ) : (
        <div className="rounded-md border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-heading">{value.name}</p>
              <p className="text-xs text-body">
                {fmtBytes(value.size)} ·{' '}
                {value.kind === 'json'
                  ? 'JSON, checked when you run'
                  : `text, ${(value.payload as { records: unknown[] }).records.length} record(s)`}
              </p>
            </div>
            <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(null)}>
              Remove
            </Button>
          </div>
          <details className="px-4 py-3">
            <summary className="cursor-pointer text-sm text-link underline">Preview</summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded-sm border border-line bg-neu-50 p-3 font-mono text-xs text-heading">
              {JSON.stringify(value.payload, null, 2).slice(0, 4000)}
            </pre>
          </details>
        </div>
      )}
      {error && (
        <Alert kind="error" className="mt-2">
          {error}
        </Alert>
      )}
    </div>
  );
}
