import { useState } from 'react';
import type { RunResult } from '../api/types';
import Button from './Button';

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

export default function ResultViewer({ result }: { result: RunResult }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const json = JSON.stringify(result, null, 2);
  const s = result.summary;

  async function copy() {
    const ok = await copyText(json);
    setCopied(ok ? 'ok' : 'fail');
    setTimeout(() => setCopied('idle'), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3>Output</h3>
        <Button variant="secondary" size="sm" onClick={copy} aria-live="polite">
          {copied === 'ok' ? 'Copied' : copied === 'fail' ? 'Copy failed' : 'Copy JSON'}
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Flags checked" value={s.flags_checked} tone="border-line bg-neu-50" />
        <Stat
          label="Findings"
          value={s.findings_total}
          tone="border-highlight-border bg-highlight"
        />
        <Stat label="Human reviewed" value={s.human_reviewed} tone="border-line bg-neu-50" />
        <Stat label="Escalated" value={s.escalated} tone="border-error-mid bg-error-faint" />
      </div>
      <pre
        className="mt-3 max-h-[28rem] overflow-auto rounded-sm border border-line bg-neu-50 p-4 font-mono text-xs text-heading"
        tabIndex={0}
        aria-label="Output JSON"
      >
        {json}
      </pre>
    </div>
  );
}
