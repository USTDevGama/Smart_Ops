import type { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Alert.module.css';

export type AlertKind = 'success' | 'info' | 'warning' | 'error';

/** Status = icon + text + colour, never colour alone (spec §7). Strong=text/icon, mid=border, subtle=bg. */
function Glyph({ kind }: { kind: AlertKind }) {
  if (kind === 'error') return <Icon name="error" />;
  if (kind === 'warning') return <Icon name="warning-mark" />;
  // No success/info icons were supplied (spec §9). 12px circle glyph until they are.
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="6" cy="6" r="6" fill="currentColor" />
    </svg>
  );
}

const LABEL: Record<AlertKind, string> = {
  success: 'Success',
  info: 'Information',
  warning: 'Warning',
  error: 'Error',
};

export function Alert({ kind = 'info', children }: { kind?: AlertKind; children: ReactNode }) {
  return (
    <div className={`${styles.alert} ${styles[kind]}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className={styles.icon}>
        <Glyph kind={kind} />
      </span>
      <span className="visually-hidden">{LABEL[kind]}: </span>
      <div>{children}</div>
    </div>
  );
}
