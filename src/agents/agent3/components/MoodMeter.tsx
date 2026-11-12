import { MAX_LEVEL } from '../hooks/chatController';

/** Client mood: level N of 4, as text plus a native progress bar. */
export function MoodMeter({ level }: { level: number }) {
  return (
    <div className="stack-sm">
      <span>
        Client mood:{' '}
        <strong>
          Level {level} of {MAX_LEVEL}
        </strong>
      </span>
      <progress
        value={level}
        max={MAX_LEVEL}
        aria-label="Client mood level"
        style={{ width: '100%', accentColor: 'var(--color-border-accent)' }}
      />
    </div>
  );
}
