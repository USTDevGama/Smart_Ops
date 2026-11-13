import { Link } from 'react-router-dom';
import { useAuth } from '@/auth';
import { agentsForRole } from '@/agents/registry';
import styles from './HomePage.module.css';

function ArrowRight() {
  return (
    <svg
      className={styles.arrow}
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const agents = user ? agentsForRole(user.role) : [];

  return (
    <div>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Four agents</p>
        <h1 className={styles.title}>Choose an agent.</h1>
        <p className={styles.signedIn}>Signed in as {user?.name}.</p>
      </section>
      <ul className={styles.grid}>
        {agents.map((a, i) => (
          <li key={a.id} className={styles.item}>
            <Link to={`/agents/${a.id}`} className={styles.card}>
              <span className={styles.num} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className={`${styles.name} ${i >= 2 ? styles.alignRow : ''}`}>{a.name}</h2>
              <p className={styles.description}>{a.description}</p>
              {a.note && (
                <div className={styles.note}>
                  <span className={styles.noteLabel}>{a.note.label}</span>
                  <p>{a.note.text}</p>
                </div>
              )}
              <span className={styles.open}>
                Open agent
                <ArrowRight />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
