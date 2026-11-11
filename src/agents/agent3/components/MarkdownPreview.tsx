import { Fragment, useState, type ReactNode } from 'react';

/**
 * Tiny, safe markdown renderer (headings, bullets, paragraphs). It builds React elements, never HTML,
 * so extracted resume text cannot inject markup. Anything fancier shows as plain text; the raw toggle
 * is always there.
 */
function renderMarkdown(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: number) => {
    if (bullets.length) {
      out.push(
        <ul key={`ul-${key}`}>
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  text.split(/\r?\n/).forEach((line, i) => {
    const bullet = /^\s*[-*]\s+(.*)/.exec(line);
    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }
    flush(i);
    const h = /^(#{1,3})\s+(.*)/.exec(line);
    if (h) {
      const Tag = `h${h[1].length + 1}` as 'h2' | 'h3' | 'h4';
      out.push(<Tag key={i}>{h[2]}</Tag>);
    } else if (line.trim()) {
      out.push(<p key={i}>{line}</p>);
    }
  });
  flush(text.length);
  return out;
}

export function MarkdownPreview({ text }: { text: string }) {
  const [raw, setRaw] = useState(false);
  return (
    <div className="stack-sm">
      <label>
        <input type="checkbox" checked={raw} onChange={(e) => setRaw(e.target.checked)} /> Show the
        raw markdown
      </label>
      {raw ? (
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{text}</pre>
      ) : (
        <Fragment>{renderMarkdown(text)}</Fragment>
      )}
    </div>
  );
}
