import { useEffect, useRef, useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { AUTH_ENABLED, useAuth } from '@/auth';
import { Link } from '@/components/ui';
import { AGENTS } from '@/agents/registry';
import motionLogo from '@/assets/ust/ust-motion-logo_58px.gif';
import staticLogo from '@/assets/ust/ust-motion-logo_static.png';
import styles from './Layout.module.css';

// "devika" -> "D"; "Devika Rajkumar" -> "DR".
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0]?.[0];
  return (letters ?? '?').toUpperCase();
}

export function Layout() {
  const { user, logout } = useAuth();
  // While an agent is open, the top bar shows that agent's short name.
  const match = useMatch('/agents/:agentId/*');
  const agent = AGENTS.find((a) => a.id === match?.params.agentId);
  const title = agent?.headerTitle ?? 'Agent Portal';
  const isHome = useMatch({ path: '/', end: true }) !== null;

  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Older browsers and jsdom may not provide matchMedia; then the motion logo is simply not used.
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The account menu closes on a click outside it or on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className={`${styles.shell} ${isHome ? styles.shellHome : ''}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <Link to="/" className={styles.home}>
              <img
                className={styles.logo}
                src={hovered && !reduceMotion ? motionLogo : staticLogo}
                alt="UST"
                width={36}
                height={36}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
              />
              <span className={styles.divider} aria-hidden="true" />
              <span className={styles.title}>{title}</span>
            </Link>
          </div>
          {user && (
            <div className={styles.account}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.role}>{user.role === 'admin' ? 'Admin' : 'Trainee'}</span>
              {AUTH_ENABLED && (
                <div className={styles.menu} ref={menuRef}>
                  <button
                    type="button"
                    className={styles.avatar}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label={`Account menu for ${user.name}`}
                    onClick={() => setMenuOpen((open) => !open)}
                  >
                    {initialsOf(user.name)}
                  </button>
                  {menuOpen && (
                    <div className={styles.dropdown} role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.menuItem}
                        onClick={() => logout()}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <main className={`${styles.main} ${isHome ? styles.mainHome : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
