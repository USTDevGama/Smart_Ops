import { NavLink } from 'react-router-dom';
import styles from './SubNav.module.css';

export type SubNavItem = { to: string; label: string; end?: boolean };

/** Page navigation inside an agent. Use relative `to` values (e.g. "resume"). */
export function SubNav({ items, label = 'Pages' }: { items: SubNavItem[]; label?: string }) {
  return (
    <nav aria-label={label} className={styles.nav}>
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.end}
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
        >
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}
