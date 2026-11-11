import styles from './Spinner.module.css';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className={styles.wrap}>
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}…</span>
    </span>
  );
}
