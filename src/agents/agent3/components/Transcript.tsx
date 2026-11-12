import { Avatar } from '@/components/ui';
import type { TurnOut } from '../api';
import styles from './Transcript.module.css';

type Props = {
  turns: TurnOut[];
  /** Admins only (the API only sends evaluations to admins anyway). */
  showEvaluation?: boolean;
  /** How the trainee's own messages are labelled. The chat says "You"; the admin review says "Trainee". */
  youLabel?: string;
};

export function Transcript({ turns, showEvaluation = false, youLabel = 'Trainee' }: Props) {
  return (
    <ol className={styles.list} aria-label="Chat transcript">
      {turns.map((t) => {
        const client = t.role === 'persona';
        return (
          <li key={t.id} className={`${styles.turn} ${client ? styles.client : styles.you}`}>
            <span className={styles.who}>
              {client ? (
                <>
                  <Avatar size={16} />
                  Client
                </>
              ) : (
                youLabel
              )}
            </span>
            <p className={styles.bubble}>{t.content}</p>
            {client && t.escalation_level != null && (
              <span className={styles.meta}>Mood: level {t.escalation_level} of 4</span>
            )}
            {showEvaluation && t.evaluation && (
              <details className={styles.eval}>
                <summary>Score notes (admin only)</summary>
                <pre>{JSON.stringify(t.evaluation, null, 2)}</pre>
              </details>
            )}
          </li>
        );
      })}
    </ol>
  );
}
