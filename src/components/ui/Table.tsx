import type { ReactNode } from 'react';
import styles from './Table.module.css';

export type Column<T> = { key: string; header: string; render: (row: T) => ReactNode };

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
};

export function Table<T>({ columns, rows, rowKey, empty = 'Nothing to show.' }: Props<T>) {
  if (rows.length === 0) return <p>{empty}</p>;
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
