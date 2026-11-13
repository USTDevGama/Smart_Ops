import { useState } from 'react';
import type { RunResult } from '../api/types';
import Button from './Button';
import FindingCard from './FindingCard';
import type { FlagDescriptions } from './FlagFacts';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / blocked clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-sm border px-3 py-2 text-heading ${tone}`}>
      <div className="text-xl font-medium tabular-nums">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

export default function ResultViewer({
  result,
  descriptions,
}: {
  result: RunResult;
  descriptions: FlagDescriptions;
}) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const json = JSON.stringify(result, null, 2);
  const flags = result.detected_flags;
  const count = (status: string) => flags.filter((f) => f.status === status).length;

  async function copy() {
    const ok = await copyText(json);
    setCopied(ok ? 'ok' : 'fail');
    setTimeout(() => setCopied('idle'), 2000);
  }

  return (
    <div>
      <h3>Output</h3>
      <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        <Stat label="Detected" value={flags.length} tone="border-highlight-border bg-highlight" />
        <Stat
          label="Accepted"
          value={count('ACCEPTED') + count('AUTO_ACCEPTED')}
          tone="border-line bg-neu-50"
        />
        <Stat label="Rejected" value={count('REJECTED')} tone="border-line bg-neu-50" />
      </div>

      {/* One scrollable area: flag cards, then the raw JSON (itself scrollable) at the bottom. */}
      <div
        role="region"
        aria-label="Output details"
        tabIndex={0}
        className="mt-4 max-h-[36rem] space-y-6 overflow-y-auto pr-1"
      >
        <section aria-labelledby="out-flags">
          <h4 id="out-flags" className="mb-2">
            Detected flags ({flags.length})
          </h4>
          {flags.length ? (
            <ul className="space-y-3">
              {flags.map((f, i) => (
                <FindingCard key={`${f.flag}-${i}`} finding={f} descriptions={descriptions} />
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-line bg-neu-50 px-4 py-3 text-sm text-heading">
              No flags were detected in this input.
            </p>
          )}
        </section>

        <section aria-labelledby="out-json">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 id="out-json">Raw JSON</h4>
            <Button variant="secondary" size="sm" onClick={copy} aria-live="polite">
              {copied === 'ok' ? 'Copied' : copied === 'fail' ? 'Copy failed' : 'Copy JSON'}
            </Button>
          </div>
          <pre
            className="max-h-72 overflow-auto rounded-sm border border-line bg-neu-50 p-4 font-mono text-xs text-heading"
            tabIndex={0}
            aria-label="Output JSON"
          >
            {json}
          </pre>
        </section>
      </div>
    </div>
  );
}
