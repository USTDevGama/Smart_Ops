import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

/** White surface with a 1px border; no shadow (spec §4 elevation). */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.card} ${className ?? ''}`} {...rest} />;
}
