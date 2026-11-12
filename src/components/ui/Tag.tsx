import type { ReactNode } from 'react';
import styles from './Tag.module.css';

export type TagKind = 'success' | 'info' | 'warning' | 'error' | 'neutral';

/** Small status label. Always carries text; colour is supplementary. */
export function Tag({ kind = 'neutral', children }: { kind?: TagKind; children: ReactNode }) {
  return <span className={`${styles.tag} ${styles[kind]}`}>{children}</span>;
}
