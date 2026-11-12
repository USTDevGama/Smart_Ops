import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from './Tabs.module.css';

export type TabDef = { id: string; label: string; content: ReactNode };

/**
 * Tabs with the WAI-ARIA keyboard pattern: Left/Right move between tabs (wrapping),
 * Home/End jump to the first/last tab. Only the selected tab is in the Tab order.
 */
export function Tabs({ tabs, label = 'Sections' }: { tabs: TabDef[]; label?: string }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const base = useId();
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeId),
  );
  const current = tabs[index];

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
        next = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        next = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    setActiveId(tabs[next].id);
    buttons.current[tabs[next].id]?.focus();
  }

  return (
    <div className={styles.root}>
      <div role="tablist" aria-label={label} className={styles.list}>
        {tabs.map((t) => {
          const selected = t.id === current.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                buttons.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              className={`${styles.tab} ${selected ? styles.active : ''}`}
              onClick={() => setActiveId(t.id)}
              onKeyDown={onKeyDown}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel-${current.id}`}
        aria-labelledby={`${base}-tab-${current.id}`}
        tabIndex={0}
        className={styles.panel}
      >
        {current.content}
      </div>
    </div>
  );
}
