import { Button, Input, Textarea } from '@/components/ui';
import type { PersonaConfig } from '../api';
import { SAMPLE_PERSONA } from '../api/mockApi';
import styles from './PersonaEditor.module.css';

export const emptyPersona = (): PersonaConfig => structuredClone(SAMPLE_PERSONA);

const toLines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/** Client-side mirror of the server's PersonaConfig rules (Pod3 app/schemas/config.py). */
export function validatePersona(c: PersonaConfig): string[] {
  const errors: string[] = [];
  if (!c.name.trim()) errors.push('Name is required.');
  if (!c.role.trim()) errors.push('Role is required.');
  if (c.main_concerns.length < 1) errors.push('Add at least one main concern.');
  if (c.escalation_ladder.length < 1)
    errors.push('Add at least one step to the escalation ladder.');
  if (c.escalation_ladder.some((s) => !s.move.trim()))
    errors.push('Every ladder step needs a move.');
  if (c.min_turns > c.max_turns)
    errors.push('Minimum messages cannot be more than maximum messages.');
  if (c.t_deescalate < c.t_escalate)
    errors.push('The calm-down threshold must be at least the escalate threshold.');
  return errors;
}

type Props = {
  value: PersonaConfig;
  onChange: (next: PersonaConfig) => void;
  disabled?: boolean;
};

export function PersonaEditor({ value, onChange, disabled }: Props) {
  const set = <K extends keyof PersonaConfig>(k: K, v: PersonaConfig[K]) =>
    onChange({ ...value, [k]: v });
  const num = (k: 'max_turns' | 'min_turns' | 'grace_turns', raw: string) =>
    set(k, Number.isFinite(+raw) ? Math.trunc(+raw) : 0);
  const ladder = value.escalation_ladder;

  return (
    <fieldset className={styles.form} disabled={disabled}>
      <Input label="Name" value={value.name} onChange={(e) => set('name', e.target.value)} />
      <Input label="Role" value={value.role} onChange={(e) => set('role', e.target.value)} />
      <Input label="Style" value={value.style} onChange={(e) => set('style', e.target.value)} />
      <Textarea
        label="Main concerns"
        helper="One per line."
        value={value.main_concerns.join('\n')}
        onChange={(e) => set('main_concerns', toLines(e.target.value))}
      />
      <Textarea
        label="Rules"
        helper="One per line."
        value={value.rules.join('\n')}
        onChange={(e) => set('rules', toLines(e.target.value))}
      />

      <div className="stack-sm">
        <h3>Escalation ladder</h3>
        {ladder.map((row, i) => (
          <div key={i} className={styles.ladderRow}>
            <span className={styles.step}>Step {i + 1}</span>
            <Input
              label={`Move for step ${i + 1}`}
              value={row.move}
              onChange={(e) =>
                set(
                  'escalation_ladder',
                  ladder.map((r, j) => (j === i ? { ...r, move: e.target.value } : r)),
                )
              }
            />
            <Button
              variant="secondary"
              compact
              aria-label={`Remove step ${i + 1}`}
              onClick={() =>
                set(
                  'escalation_ladder',
                  ladder.filter((_, j) => j !== i).map((r, j) => ({ ...r, step: j + 1 })),
                )
              }
            >
              Remove
            </Button>
          </div>
        ))}
        {ladder.length < 4 && (
          <div>
            <Button
              variant="secondary"
              compact
              onClick={() =>
                set('escalation_ladder', [...ladder, { step: ladder.length + 1, move: '' }])
              }
            >
              Add step
            </Button>
          </div>
        )}
      </div>

      <div className={styles.numbers}>
        <Input
          label="Maximum messages"
          type="number"
          min={1}
          max={50}
          value={value.max_turns}
          onChange={(e) => num('max_turns', e.target.value)}
        />
        <Input
          label="Minimum messages"
          type="number"
          min={1}
          max={50}
          value={value.min_turns}
          onChange={(e) => num('min_turns', e.target.value)}
        />
        <Input
          label="Grace messages"
          type="number"
          min={0}
          max={20}
          value={value.grace_turns}
          onChange={(e) => num('grace_turns', e.target.value)}
        />
      </div>

      <div className={styles.numbers}>
        <Slider
          label="Escalate below"
          value={value.t_escalate}
          onChange={(v) => set('t_escalate', v)}
        />
        <Slider
          label="Calm down above"
          value={value.t_deescalate}
          onChange={(v) => set('t_deescalate', v)}
        />
      </div>
    </fieldset>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="stack-sm">
      <span>
        {label}: <strong>{value.toFixed(2)}</strong>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ accentColor: 'var(--color-border-accent)' }}
      />
    </label>
  );
}
